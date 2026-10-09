"""Speech (TTS) endpoint — the delivery layer's audio.

Returns the audio bytes directly: no storage, no signed URL. A three-second
sentence is a stateless request, not a resource with a lifecycle, and the
Supabase Storage layer in this repo exists for course VIDEOS (with TTL sweeps) —
reusing it for a sentence would turn a request into a thing to garbage-collect
(voice-v0 plan §4).

Failure contract: the frontend's remote voice degrades to the browser voice on
ANY non-2xx, so provider trouble surfaces as 502 with a stable `code` rather than
a 500 with a stack trace.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel, Field

from ai.errors import AIError
from ai.speech import synthesize
from ai.speech.provider import CONTENT_TYPE, MAX_INPUT_CHARS
from core.security import CurrentUser, get_current_user

router = APIRouter(prefix="/speech", tags=["speech"])


class SynthesizeIn(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_INPUT_CHARS)


@router.post("/synthesize")
async def synthesize_speech(
    payload: SynthesizeIn,
    current_user: CurrentUser = Depends(get_current_user),
) -> Response:
    try:
        audio = await synthesize(payload.text, user_id=str(current_user.id))
    except AIError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=exc.code
        ) from exc
    return Response(content=audio, media_type=CONTENT_TYPE)