"""AI 伴学 business logic: grounded video Q&A around AIClient.stream_ask_video.

Composes conversation_service (history + persistence), course/video_asset_service
(IDOR + the chapter's chosen candidate), and gemini_file_service (the Files API
cache) — it never touches the ORM directly. Split like chat_service: prepare the
turn (resolve the conversation id BEFORE streaming, for the X-Conversation-Id
header), then stream the answer and persist the pair on a protected task.

Source-of-truth boundaries (rules): the video the model sees is the chapter's
re-hosted asset, fed via the Gemini Files API by file_uri; history is text-only
(the current chapter video is re-attached every turn, so 48h file expiry never
strands old references — 见 plan 2.5).
"""

import asyncio
import contextlib
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from ai import AIChunk, AIUseCase, ChatMessage, ai_client
from ai.types import VideoInput
from core import aio
from core.security import CurrentUser
from schemas.companion import CompanionChatRequest
from services import (
    conversation_service,
    course_service,
    gemini_file_service,
    video_asset_service,
)


@dataclass
class CompanionTurnContext:
    conversation_id: uuid.UUID
    user_id: uuid.UUID
    course_id: uuid.UUID
    chapter_id: uuid.UUID
    # The chapter's chosen candidate — keys the Gemini file cache and detects a
    # re-pick (a different candidate makes the cached file stale).
    candidate_id: uuid.UUID
    question: str
    user_sent_at: datetime
    history: list[ChatMessage]
    # Set for a NEW conversation (its row doesn't exist yet); persist_turn
    # creates it (with course_id) together with the first turn.
    new_conversation_title: str | None = None


async def prepare_turn(
    db: AsyncSession,
    payload: CompanionChatRequest,
    user: CurrentUser,
    *,
    course_id: uuid.UUID,
) -> CompanionTurnContext | None:
    """Resolve the conversation + chapter for this turn before streaming.

    IDOR red lines (all -> None -> 404, indistinguishable):
    - the course must belong to the caller;
    - the chapter must be in that course and have a chosen video;
    - a continued conversation must belong to the caller AND to THIS course.
    A new conversation is not written here — only its id is generated.
    """
    course = await course_service.get_owned_course(
        db, user_id=user.id, course_id=course_id
    )
    if course is None:
        return None
    candidate_id = await video_asset_service.get_chapter_chosen_candidate_id(
        db, course_id=course_id, chapter_id=payload.chapter_id
    )
    if candidate_id is None:
        return None

    if payload.conversation_id is None:
        return CompanionTurnContext(
            conversation_id=uuid.uuid4(),
            user_id=user.id,
            course_id=course_id,
            chapter_id=payload.chapter_id,
            candidate_id=candidate_id,
            question=payload.message,
            user_sent_at=datetime.now(UTC),
            history=[],
            new_conversation_title=conversation_service.title_from_first_message(
                payload.message
            ),
        )

    conversation = await conversation_service.get_owned_conversation(
        db, user_id=user.id, conversation_id=payload.conversation_id
    )
    if conversation is None or conversation.course_id != course_id:
        return None
    rows = await conversation_service.load_recent_history(
        db, conversation_id=conversation.id
    )
    history = [
        ChatMessage(role=row.role, content=row.content_text) for row in rows
    ]
    return CompanionTurnContext(
        conversation_id=conversation.id,
        user_id=user.id,
        course_id=course_id,
        chapter_id=payload.chapter_id,
        candidate_id=candidate_id,
        question=payload.message,
        user_sent_at=datetime.now(UTC),
        history=history,
    )


async def resolve_video(
    db: AsyncSession, context: CompanionTurnContext
) -> VideoInput | None:
    """A ready, non-expired Gemini file reference for the chapter, else None."""
    return await gemini_file_service.read_usable(
        db, chapter_id=context.chapter_id, candidate_id=context.candidate_id
    )


async def trigger_ingest(
    db: AsyncSession, context: CompanionTurnContext
) -> bool:
    """Mark the chapter's Gemini file pending and enqueue the ingest task once
    the re-hosted asset is ready. Returns True if an ingest is now in flight,
    False if the chapter video itself isn't ready yet (nothing to upload)."""
    asset_status = await video_asset_service.get_chapter_asset_status(
        db, chapter_id=context.chapter_id
    )
    if asset_status != "ready":
        return False
    await gemini_file_service.ensure_pending(
        db, chapter_id=context.chapter_id, candidate_id=context.candidate_id
    )
    # Lazy import: tasks import services, so a top-level import would cycle.
    from tasks.companion_video_ingest import ingest_chapter_gemini_file

    ingest_chapter_gemini_file.delay(str(context.chapter_id))
    return True


async def stream_answer(
    context: CompanionTurnContext, video: VideoInput
) -> AsyncIterator[AIChunk]:
    """Stream the companion answer and persist the pair (course-homed).

    Mirrors chat_service.stream_turn: persistence runs on a protected background
    task scheduled synchronously in `finally`, so a mid-stream disconnect still
    lands the turn. raw_parts stays None — history is text-only by design (the
    video is re-attached each turn, never replayed from history).
    """
    parts: list[str] = []
    reasoning_parts: list[str] = []
    persist_task: asyncio.Task | None = None

    def ensure_persist_scheduled() -> None:
        nonlocal persist_task
        assistant_text = "".join(parts)
        reasoning_text = "".join(reasoning_parts) or None
        if persist_task is None and assistant_text:
            persist_task = aio.spawn_protected(
                conversation_service.persist_turn(
                    conversation_id=context.conversation_id,
                    user_id=context.user_id,
                    new_conversation_title=context.new_conversation_title,
                    new_conversation_course_id=context.course_id,
                    user_content=context.question,
                    user_sent_at=context.user_sent_at,
                    assistant_content=assistant_text,
                    assistant_reasoning_text=reasoning_text,
                    raw_parts=None,
                )
            )

    chunk_stream = ai_client.stream_ask_video(
        AIUseCase.COURSE_COMPANION,
        video,
        context.question,
        history=context.history,
        user_id=str(context.user_id),
        course_id=str(context.course_id),
        conversation_id=str(context.conversation_id),
    )
    try:
        async for chunk in chunk_stream:
            if chunk.kind == "delta" and chunk.text:
                parts.append(chunk.text)
            elif chunk.kind == "reasoning" and chunk.reasoning_text:
                reasoning_parts.append(chunk.reasoning_text)
            elif chunk.kind == "done":
                ensure_persist_scheduled()
            yield chunk
    finally:
        ensure_persist_scheduled()
        with contextlib.suppress(Exception):
            await chunk_stream.aclose()
        if persist_task is not None and not persist_task.done():
            with contextlib.suppress(asyncio.CancelledError):
                await asyncio.shield(persist_task)
