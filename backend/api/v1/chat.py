from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ai import AIChunk, encode_chunk
from core.database import get_db
from core.security import CurrentUser, get_current_user
from schemas.ai import ChatRequest
from services.chat_service import prepare_turn, stream_turn

router = APIRouter(prefix="/chat", tags=["chat"])


async def _encode_sse(chunks: AsyncIterator[AIChunk]) -> AsyncIterator[str]:
    """Protocol adapter: typed facade events -> Lemma SSE frames."""
    async for chunk in chunks:
        yield encode_chunk(chunk)


@router.post("")
async def create_chat_stream(
    payload: ChatRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    # Conversation is resolved (or created) before streaming so the response
    # can announce its id in a header from the first byte.
    context = await prepare_turn(db, payload, current_user)
    if context is None:
        # Foreign and nonexistent conversations are indistinguishable on
        # purpose: no probing which ids exist (IDOR red line).
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="conversation_not_found"
        )
    return StreamingResponse(
        _encode_sse(stream_turn(context)),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            # Tell reverse proxies (nginx) not to buffer, so tokens flush live.
            "X-Accel-Buffering": "no",
            "X-Conversation-Id": str(context.conversation_id),
        },
    )
