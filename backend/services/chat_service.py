"""Chat business logic: conversation state + persistence around AIClient.

Split into two steps because the conversation id must be known BEFORE the
SSE response starts (it travels in the X-Conversation-Id header):

    prepare_turn()  -> create-or-load the conversation, rebuild history
    run_turn()      -> dispatch on the request's tool: plain text or a tool turn

A plain turn (stream_turn) just streams the model. A tool turn (currently only
stream_course_planning_turn) streams a short AI intro, runs the tool's own
service, then attaches a tool card via one `tool` chunk — same conversation
resolution, SSE protocol and persistence as a plain turn, only the body differs.

Persistence rule (拍板 2026-06-11): the user+assistant pair is written once
the first token has been emitted — partial answers from a stop/error are kept
(the user saw them, the tokens are paid for). If the turn fails before any
output, nothing is written and a retry starts clean.
"""

import asyncio
import contextlib
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from ai import AIChunk, AIUseCase, ChatMessage, ai_client
from core import aio
from core.database import AsyncSessionLocal
from core.security import CurrentUser
from schemas.ai import ChatRequest
from services import conversation_service, course_planning_service, project_service


@dataclass
class TurnContext:
    conversation_id: uuid.UUID
    user_id: uuid.UUID
    user_content: str
    user_sent_at: datetime
    history: list[ChatMessage]
    # Set for a NEW conversation: the row doesn't exist yet (its id is
    # pre-generated); persist_turn creates it together with the first turn.
    new_conversation_title: str | None = None
    # New conversation born inside a project (ownership already verified).
    new_conversation_project_id: uuid.UUID | None = None


# The previous turn's write is async (done doesn't wait for it); a fast
# follow-up message may race it. Total grace ≈ 7 × 250ms — generously above
# the worst observed write latency (~1.2s); forged ids pay ~1.75s before 404.
_LOOKUP_GRACE_ATTEMPTS = 8
_LOOKUP_GRACE_INTERVAL_S = 0.25


async def prepare_turn(
    db: AsyncSession, payload: ChatRequest, user: CurrentUser
) -> TurnContext | None:
    """Resolve the conversation for this turn before streaming starts.

    A new conversation is NOT written here — only its id is generated, so a
    turn that dies before the first token leaves no empty conversation behind.
    Returns None when the requested conversation doesn't belong to the caller
    (the API layer answers 404 — indistinguishable from "doesn't exist").
    """
    content = payload.user_content
    if payload.conversation_id is None:
        if payload.project_id is not None:
            # Same IDOR rule as conversations: foreign/unknown project -> 404.
            project = await project_service.get_owned_project(
                db, user_id=user.id, project_id=payload.project_id
            )
            if project is None:
                return None
        return TurnContext(
            conversation_id=uuid.uuid4(),
            user_id=user.id,
            user_content=content,
            user_sent_at=datetime.now(UTC),
            history=[],
            new_conversation_title=conversation_service.title_from_first_message(
                content
            ),
            new_conversation_project_id=payload.project_id,
        )

    conversation = None
    for attempt in range(_LOOKUP_GRACE_ATTEMPTS):
        conversation = await conversation_service.get_owned_conversation(
            db, user_id=user.id, conversation_id=payload.conversation_id
        )
        if conversation is not None:
            break
        if attempt < _LOOKUP_GRACE_ATTEMPTS - 1:
            await asyncio.sleep(_LOOKUP_GRACE_INTERVAL_S)
    if conversation is None:
        return None
    rows = await conversation_service.load_recent_history(
        db, conversation_id=conversation.id
    )
    return TurnContext(
        conversation_id=conversation.id,
        user_id=user.id,
        user_content=content,
        user_sent_at=datetime.now(UTC),
        history=[ChatMessage(role=row.role, content=row.content_text) for row in rows],
    )


async def stream_turn(context: TurnContext) -> AsyncIterator[AIChunk]:
    """Run one AI turn and persist the message pair.

    Persistence runs on a protected background task (spawn_protected:
    synchronous scheduling, own task, module-held strong reference), never
    awaited on the user's critical path:
    - `done` is yielded immediately; the write lands ~roundtrip later.
      The follow-up-message race is covered by prepare_turn's grace retry.
    - Disconnect mid-stream (browsers cancel with anyio-style repeating
      cancellation, bug 2026-06-12): the finally block schedules the write
      synchronously, so it survives even when every await here insta-raises
      and this generator's frame is torn down.
    """
    parts: list[str] = []
    raw_parts: dict[str, Any] | None = None
    persist_task: asyncio.Task[Any] | None = None

    def ensure_persist_scheduled() -> asyncio.Task[Any] | None:
        nonlocal persist_task
        assistant_text = "".join(parts)
        if persist_task is None and assistant_text:
            persist_task = aio.spawn_protected(
                conversation_service.persist_turn(
                    conversation_id=context.conversation_id,
                    user_id=context.user_id,
                    new_conversation_title=context.new_conversation_title,
                    new_conversation_project_id=context.new_conversation_project_id,
                    user_content=context.user_content,
                    user_sent_at=context.user_sent_at,
                    assistant_content=assistant_text,
                    raw_parts=raw_parts,
                )
            )
        return persist_task

    chunk_stream = ai_client.stream_chat(
        AIUseCase.TEXT_CHAT,
        [*context.history, ChatMessage(role="user", content=context.user_content)],
        user_id=str(context.user_id),
        conversation_id=str(context.conversation_id),
    )
    try:
        async for chunk in chunk_stream:
            if chunk.kind == "delta" and chunk.text:
                parts.append(chunk.text)
            elif chunk.kind == "done":
                raw_parts = chunk.raw_parts
                # Scheduled, NOT awaited: a DB roundtrip before `done` would
                # hold the user's send button hostage (~1s on dev topology).
                # Durability is guaranteed by the protected task; the
                # "next message races the write" window is covered by
                # prepare_turn's in-flight grace retry.
                ensure_persist_scheduled()
            yield chunk
    finally:
        # Schedule FIRST and synchronously: under re-cancellation every await
        # below may raise immediately, but the write is already on its own
        # protected task by then.
        ensure_persist_scheduled()
        # Close the inner generator deterministically (books the interrupted
        # ledger row now instead of whenever GC finalizes it). May insta-raise
        # under cancellation — the persist above no longer depends on it.
        with contextlib.suppress(Exception):
            await chunk_stream.aclose()
        if persist_task is not None and not persist_task.done():
            with contextlib.suppress(asyncio.CancelledError):
                await asyncio.shield(persist_task)


def run_turn(
    context: TurnContext, *, tool: str | None, user: CurrentUser
) -> AsyncIterator[AIChunk]:
    """Dispatch a turn to its runner. Plain text by default; a tool turn when
    the request asked for one. Returns the async iterator (not awaited) so the
    API layer wraps it straight into the SSE response."""
    if tool == "course_planning":
        return stream_course_planning_turn(context, user)
    return stream_turn(context)


async def stream_course_planning_turn(
    context: TurnContext, user: CurrentUser
) -> AsyncIterator[AIChunk]:
    """Course-planning tool turn: create the course up front, stream a short AI
    intro, then attach the card with one `tool` chunk.

    Ordering matters for two reasons:
    - The course shell is created BEFORE the intro streams, so the turn has a
      course id from the first token. Closing the tab mid-intro still persists
      the turn (same "first token persists" guarantee as a plain chat turn).
    - The questionnaire is generated on a protected background task, NOT inline,
      so `done` fires right after the intro: the card appears immediately (with
      a skeleton) instead of after the slow questionnaire LLM call.

    A NEW conversation isn't in the DB yet, so the course links via the message
    tool_json reference rather than course.conversation_id (which would violate
    the FK pre-persist).
    """
    intro_parts: list[str] = []
    raw_parts: dict[str, Any] | None = None
    persist_task: asyncio.Task[Any] | None = None

    plan_conversation_id = (
        None if context.new_conversation_title else context.conversation_id
    )
    async with AsyncSessionLocal() as db:
        course = await course_planning_service.create_course_shell(
            db,
            user,
            topic=context.user_content,
            conversation_id=plan_conversation_id,
        )
    course_id = course.id
    # Generate the questionnaire off the critical path: it fills the course
    # afterwards (the card polls for it) and survives a client disconnect.
    aio.spawn_protected(
        course_planning_service.generate_and_store_questionnaire(
            course_id, topic=context.user_content
        )
    )

    def ensure_persist_scheduled() -> None:
        nonlocal persist_task
        intro_text = "".join(intro_parts)
        # course_id always exists here (created above); persist once the intro
        # has produced output, mirroring the plain chat turn.
        if persist_task is None and intro_text:
            persist_task = aio.spawn_protected(
                conversation_service.persist_turn(
                    conversation_id=context.conversation_id,
                    user_id=context.user_id,
                    new_conversation_title=context.new_conversation_title,
                    new_conversation_project_id=context.new_conversation_project_id,
                    user_content=context.user_content,
                    user_sent_at=context.user_sent_at,
                    assistant_content=intro_text,
                    raw_parts=raw_parts,
                    tool_ref={
                        "type": "course_planning",
                        "courseId": str(course_id),
                    },
                )
            )

    intro_stream = ai_client.stream_chat(
        AIUseCase.COURSE_PLAN_INTRO,
        [*context.history, ChatMessage(role="user", content=context.user_content)],
        user_id=str(context.user_id),
        conversation_id=str(context.conversation_id),
    )
    try:
        async for chunk in intro_stream:
            if chunk.kind == "delta":
                if chunk.text:
                    intro_parts.append(chunk.text)
                yield chunk
            elif chunk.kind == "usage":
                yield chunk
            elif chunk.kind == "done":
                # Capture for history rebuild; do NOT forward — the TURN isn't
                # done until the card is attached below.
                raw_parts = chunk.raw_parts
            elif chunk.kind == "error":
                # Intro failed before producing output: surface and stop. The
                # orphan course shell is swept later; nothing is persisted.
                yield chunk
                return

        # Intro streamed OK -> attach the card and finish the turn.
        yield AIChunk(
            kind="tool",
            tool={"type": "course_planning", "courseId": str(course_id)},
        )
        ensure_persist_scheduled()
        yield AIChunk(kind="done")
    finally:
        ensure_persist_scheduled()
        with contextlib.suppress(Exception):
            await intro_stream.aclose()
        if persist_task is not None and not persist_task.done():
            with contextlib.suppress(asyncio.CancelledError):
                await asyncio.shield(persist_task)
