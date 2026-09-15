"""Voice API — single endpoint for a push-to-talk turn.

POST /api/v1/voice/turn
  body:     raw audio bytes (any browser codec), Content-Type set accordingly
  query:    user_id (optional, str)
  -> 200 { transcript, reply_text, audio_base64, audio_mime }

We read the raw request body instead of multipart `UploadFile` on purpose:
binary audio is cleaner as a single blob, and it avoids pulling in
python-multipart. The SPA just does fetch(blob) with a Content-Type header.
Auth is intentionally NOT enforced here yet (v2) — this is an isolated spike
behind `voice_enabled`.

The actual pipeline lives in the isolated `voice` package (top-level); this
module only adapts it to HTTP.
"""

import base64

from fastapi import APIRouter, HTTPException, Request, status

from voice.errors import VoiceConfigError, VoiceProviderError
from voice.service import VoiceTurnService

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post("/turn")
async def voice_turn(request: Request, user_id: str | None = None) -> dict:
    try:
        service = VoiceTurnService()
    except VoiceConfigError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )

    raw = await request.body()
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="empty audio payload"
        )
    content_type = request.headers.get("content-type") or "audio/webm"

    try:
        result = await service.run_turn(
            raw, content_type=content_type, user_id=user_id
        )
    except VoiceProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
        )

    return {
        "transcript": result.transcript,
        "reply_text": result.reply_text,
        "audio_base64": base64.b64encode(result.audio).decode("ascii"),
        "audio_mime": result.audio_mime,
    }
