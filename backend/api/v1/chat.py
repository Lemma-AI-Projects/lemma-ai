from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from core.security import CurrentUser, get_current_user
from schemas.ai import ChatRequest
from services.chat_service import stream_chat

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("")
async def create_chat_stream(
    payload: ChatRequest,
    current_user: CurrentUser = Depends(get_current_user),
) -> StreamingResponse:
    return StreamingResponse(
        stream_chat(payload, current_user),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            # Tell reverse proxies (nginx) not to buffer, so tokens flush live.
            "X-Accel-Buffering": "no",
        },
    )
