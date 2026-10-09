"""The one entry point callers use: text -> audio bytes.

Owns the ledger row for BOTH outcomes and maps provider failures to business
errors — same discipline as the AIClient facade (终稿 6.2): a failed synthesis
still costs money, so it is booked, and the error keeps a stable `code` the API
layer can turn into a status the frontend knows how to degrade from.
"""

import time
import uuid

from ai.errors import AIError
from ai.speech.provider import AiHubMixSpeech, SpeechProvider
from ai.speech.usage import record_speech_call


def _default_provider() -> SpeechProvider:
    return AiHubMixSpeech()


async def synthesize(
    text: str,
    *,
    user_id: str | None = None,
    provider: SpeechProvider | None = None,
) -> bytes:
    spoken = text.strip()
    if not spoken:
        raise AIError("nothing to synthesize")

    voice = provider or _default_provider()
    trace_id = uuid.uuid4().hex
    started = time.monotonic()
    try:
        audio = await voice.synthesize(spoken)
    except AIError as exc:
        await record_speech_call(
            trace_id=trace_id,
            model=voice.model,
            chars=len(spoken),
            success=False,
            latency_ms=int((time.monotonic() - started) * 1000),
            user_id=user_id,
            error_type=exc.code,
        )
        raise

    await record_speech_call(
        trace_id=trace_id,
        model=voice.model,
        chars=len(spoken),
        success=True,
        latency_ms=int((time.monotonic() - started) * 1000),
        user_id=user_id,
    )
    return audio