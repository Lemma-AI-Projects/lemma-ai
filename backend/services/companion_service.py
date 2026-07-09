"""AI 伴学 business logic: text-first chat with the chapter video as a TOOL.

The companion is always available (any content node — video / overview / quiz /
assignment / a chapter with no video). It answers in text by default and, when
the model decides it needs to see what the user is watching, calls the
`load_chapter_video` tool; the AIClient tool loop (native channel) then injects
the chapter's Gemini file and continues. This module wires that loop: it composes
conversation_service (history + persistence), video_asset_service (IDOR + the
chapter's chosen candidate) and chapter_gemini_prep (ensure the Gemini file),
and provides the tool HANDLER as a closure over THIS turn's chapter — ai/ never
imports services. It never touches the ORM directly.

Boundaries (rules): history is text-only (the video is re-introduced per turn via
the tool, never replayed from history, so 48h file expiry never strands old refs);
the handler only ever loads the CURRENT turn's chapter (非粘性, 每轮重判).
"""

import asyncio
import contextlib
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from ai import (
    LOAD_CHAPTER_VIDEO,
    AIChunk,
    AIUseCase,
    ChatMessage,
    ToolBinding,
    ToolCall,
    ToolProgress,
    ToolResult,
    ai_client,
    tool_spec,
)
from ai.video_limits import media_resolution_for_duration
from core import aio
from core.security import CurrentUser
from schemas.companion import CompanionChatRequest
from services import (
    chapter_gemini_prep,
    conversation_service,
    conversation_tool_service,
    course_service,
    video_asset_service,
)


@dataclass
class CompanionTurnContext:
    conversation_id: uuid.UUID
    user_id: uuid.UUID
    course_id: uuid.UUID
    question: str
    user_sent_at: datetime
    history: list[ChatMessage]
    # The chapter the user is currently on, and its chosen candidate (keys the
    # Gemini-file cache). BOTH None when the content node has no video (quiz /
    # assignment / unknown chapter) — the video tool then degrades to text-only.
    chapter_id: uuid.UUID | None = None
    candidate_id: uuid.UUID | None = None
    # Chosen video duration: drives the long-video media-resolution downgrade
    # (ai/video_limits); must match the overview's choice for cache hits.
    video_duration_s: int | None = None
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
    """Resolve the conversation (+ optional chapter) for this turn before streaming.

    IDOR red lines (all -> None -> 404, indistinguishable):
    - the course must belong to the caller;
    - a continued conversation must belong to the caller AND to THIS course.
    A MISSING / foreign chapter or a chapter with no chosen video is NOT a 404 —
    the companion stays text-only for it (契约变更: 不再因无视频 404). A new
    conversation is not written here — only its id is generated.
    """
    course = await course_service.get_owned_course(
        db, user_id=user.id, course_id=course_id
    )
    if course is None:
        return None

    # Optional: resolve the current chapter's chosen candidate. None (foreign /
    # unknown / no chosen video) just means "no video to load" — never a 404.
    candidate_id: uuid.UUID | None = None
    video_duration_s: int | None = None
    if payload.chapter_id is not None:
        ref = await video_asset_service.get_chapter_chosen_candidate_ref(
            db, course_id=course_id, chapter_id=payload.chapter_id
        )
        if ref is not None:
            candidate_id, video_duration_s = ref

    if payload.conversation_id is None:
        return CompanionTurnContext(
            conversation_id=uuid.uuid4(),
            user_id=user.id,
            course_id=course_id,
            question=payload.message,
            user_sent_at=datetime.now(UTC),
            history=[],
            chapter_id=payload.chapter_id,
            candidate_id=candidate_id,
            video_duration_s=video_duration_s,
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
        question=payload.message,
        user_sent_at=datetime.now(UTC),
        history=history,
        chapter_id=payload.chapter_id,
        candidate_id=candidate_id,
        video_duration_s=video_duration_s,
    )


def _build_video_tool(context: CompanionTurnContext) -> ToolBinding:
    """The `load_chapter_video` tool, bound to THIS turn's chapter (非粘性).

    The handler ignores its (argless) call and always loads the current chapter:
    cold ⇒ emit ToolProgress(preparing) while the shared chain downloads+uploads,
    then ToolResult(media=video); no video for this node ⇒ ToolResult(unavailable)
    so the model answers from text alone.
    """
    spec = tool_spec(LOAD_CHAPTER_VIDEO)

    async def handler(_call: ToolCall) -> AsyncIterator[ToolProgress | ToolResult]:
        async for event in chapter_gemini_prep.stream_until_usable(
            chapter_id=context.chapter_id, candidate_id=context.candidate_id
        ):
            if event.kind == "preparing":
                yield ToolProgress()
            elif event.kind == "ready":
                yield ToolResult(response={"status": "loaded"}, media=event.video)
                return
            else:  # unavailable / failed -> let the model fall back to text
                yield ToolResult(response={"status": "unavailable"})
                return

    return ToolBinding(spec=spec, handler=handler)


async def stream_answer(context: CompanionTurnContext) -> AsyncIterator[AIChunk]:
    """Stream the companion answer (text-first + video tool) and persist the pair.

    Mirrors chat_service.stream_turn: persistence runs on a protected background
    task scheduled synchronously in `finally`, so a mid-stream disconnect still
    lands the turn. raw_parts stays None — history is text-only by design (the
    video is re-introduced each turn via the tool, never replayed from history).

    Besides the video tool, the global plugin tools (Desmos 三件套) are bound
    every turn; a `tool` chunk (card) is captured as tool_ref -> tool_json.
    """
    parts: list[str] = []
    reasoning_parts: list[str] = []
    tool_ref: dict | None = None
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
                    tool_ref=tool_ref,
                )
            )

    # New companion conversation: same first-turn rule as chat_service — the
    # row lands with persist_turn, so plugin graphs stay unlinked until then.
    plugin_tools = conversation_tool_service.build_global_tools(
        user_id=context.user_id,
        conversation_id=(
            None if context.new_conversation_title else context.conversation_id
        ),
    )
    chunk_stream = ai_client.stream_tool_chat(
        AIUseCase.COURSE_COMPANION,
        question=context.question,
        history=context.history,
        tools=[_build_video_tool(context), *plugin_tools],
        user_id=str(context.user_id),
        course_id=str(context.course_id),
        conversation_id=str(context.conversation_id),
        media_resolution=media_resolution_for_duration(context.video_duration_s),
    )
    try:
        async for chunk in chunk_stream:
            if chunk.kind == "delta" and chunk.text:
                parts.append(chunk.text)
            elif chunk.kind == "reasoning" and chunk.reasoning_text:
                reasoning_parts.append(chunk.reasoning_text)
            elif chunk.kind == "tool":
                if chunk.tool:
                    tool_ref = chunk.tool
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
