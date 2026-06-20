"""AI 伴学 endpoints: list a course's companion conversations + ask (SSE).

Course-scoped under /courses/{course_id}/companion. The chat body is an SSE
stream (reuses ai/streaming encode_chunk + a `preparing` event while the chapter
video is being uploaded to the Gemini Files API). IDOR is enforced in
companion_service.prepare_turn (course / chapter / conversation ownership).
"""

import asyncio
import json
import uuid
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ai import encode_chunk
from core.database import AsyncSessionLocal, get_db
from core.security import CurrentUser, get_current_user
from models.ai_conversation import AiConversation
from schemas.companion import CompanionChatRequest, CompanionConversationOut
from services import (
    companion_service,
    conversation_service,
    course_service,
    gemini_file_service,
)

router = APIRouter(prefix="/courses", tags=["companion"])

_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="not_found"
)

# Prepare wait: poll the Gemini-file cache this often while the chapter video is
# uploaded, up to a ceiling. A timeout is retryable (the ingest likely lands and
# the retry hits the cache); the SSE `preparing` heartbeats keep the connection
# alive meanwhile.
_PREPARE_POLL_S = 2.0
_PREPARE_MAX_TICKS = 180  # ~6 min ceiling


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.get(
    "/{course_id}/companion/conversations",
    response_model=list[CompanionConversationOut],
)
async def list_companion_conversations(
    course_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AiConversation]:
    course = await course_service.get_owned_course(
        db, user_id=current_user.id, course_id=course_id
    )
    if course is None:
        raise _NOT_FOUND
    return await conversation_service.list_course_conversations(
        db, course_id=course_id, limit=limit, offset=offset
    )


@router.post("/{course_id}/companion/chat")
async def companion_chat(
    course_id: uuid.UUID,
    payload: CompanionChatRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    # Conversation is resolved (or its id generated) before streaming so the
    # response can announce it in the header from the first byte (same as /chat).
    context = await companion_service.prepare_turn(
        db, payload, current_user, course_id=course_id
    )
    if context is None:
        # Foreign/unknown course, chapter, or conversation are indistinguishable
        # on purpose (IDOR red line).
        raise _NOT_FOUND
    return StreamingResponse(
        _companion_event_stream(context),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "X-Conversation-Id": str(context.conversation_id),
        },
    )


async def _companion_event_stream(
    context: companion_service.CompanionTurnContext,
) -> AsyncIterator[str]:
    """Wait for the chapter's Gemini file (emitting `preparing`), then stream the
    answer. Each tick uses its own short-lived session (never holds the request
    db for the stream's lifetime)."""
    video = None
    enqueued = False
    for _tick in range(_PREPARE_MAX_TICKS):
        async with AsyncSessionLocal() as db:
            video = await companion_service.resolve_video(db, context)
            if video is not None:
                break
            if (
                enqueued
                and await gemini_file_service.read_status(
                    db, chapter_id=context.chapter_id
                )
                == "failed"
            ):
                yield _sse(
                    "error",
                    {
                        "code": "companion_video_failed",
                        "message": "视频解析失败，请稍后重试",
                    },
                )
                return
            if not enqueued:
                enqueued = await companion_service.trigger_ingest(db, context)
        yield _sse("preparing", {})
        await asyncio.sleep(_PREPARE_POLL_S)
    else:
        # Loop exhausted without a ready file — retryable (ingest may still land).
        yield _sse(
            "error",
            {
                "code": "companion_video_preparing",
                "message": "视频准备超时，请稍后重试",
            },
        )
        return

    async for chunk in companion_service.stream_answer(context, video):
        yield encode_chunk(chunk)
