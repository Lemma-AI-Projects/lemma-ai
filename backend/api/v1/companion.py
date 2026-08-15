"""AI 伴学 endpoints: list a course's companion conversations + ask (SSE).

Course-scoped under /courses/{course_id}/companion. The chat body is an SSE
stream (reuses ai/streaming encode_chunk). The companion is text-first; a
`preparing` event is emitted only when the model calls the video tool and the
chapter file is still uploading to Gemini — so the endpoint just relays the
AIChunks. IDOR is enforced in companion_service.prepare_turn (course /
conversation ownership; a missing/foreign chapter is NOT a 404 — text-only).
"""

import uuid
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ai import encode_chunk
from core.database import AsyncSessionLocal, get_db
from core.security import CurrentUser, get_current_user
from models.ai_conversation import AiConversation
from schemas.companion import CompanionChatRequest, CompanionConversationOut
from services import companion_service, conversation_service, course_service
from services.credits.ledger import InsufficientCredits, require_credits

router = APIRouter(prefix="/courses", tags=["companion"])

_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="not_found"
)


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
) -> StreamingResponse:
    # Conversation is resolved (or its id generated) before streaming so the
    # response can announce it in the header from the first byte (same as /chat).
    # Short-lived session (NOT Depends(get_db)): a streaming response holds its
    # dependency's DB for the whole stream and errors on cleanup on disconnect.
    async with AsyncSessionLocal() as db:
        # Hard credit gate (拍板 2026-08-14): zero credits blocks the turn with
        # a clean 402 so the client can route to the top-up page.
        try:
            await require_credits(db, current_user.id, min_credits=1)
        except InsufficientCredits as exc:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="insufficient_credits",
            ) from exc
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
    """Relay the tool-chat AIChunks as SSE. `preparing` (the video tool warming
    the Gemini file), reasoning/delta, usage, done and error all originate in the
    AIClient tool loop and are encoded by encode_chunk — no pre-stream poll."""
    async for chunk in companion_service.stream_answer(context):
        yield encode_chunk(chunk)
