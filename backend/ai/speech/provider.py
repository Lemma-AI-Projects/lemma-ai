"""Provider protocol + the AiHubMix implementation (OpenAI-compatible
`/audio/speech`).

One provider today. The protocol exists so a second one — or a fallback chain —
can be added inside this package without callers knowing (voice-v0 plan §2.1).
"""

from typing import Protocol

import httpx

from ai.errors import AIProviderError, AITimeoutError
from core.config import settings

# AiHubMix caps `input` at 4096 characters. A lesson sentence is far below that,
# but the endpoint must not forward something the provider will reject outright.
MAX_INPUT_CHARS = 4096

# mp3 is the default and is playable by the browser <audio> element everywhere
# this ships. The Gemini TTS models only emit wav/pcm, so they are not reachable
# through this path as configured.
_RESPONSE_FORMAT = "mp3"
CONTENT_TYPE = "audio/mpeg"

# One client for the process: per-request clients would pay a fresh TCP+TLS
# handshake on every sentence, which is exactly the latency the per-sentence
# strategy is trying to avoid. Mirrors ai/model_factory.py's shared client.
_client: httpx.AsyncClient | None = None


def _http() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(settings.speech_tts_timeout_seconds),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )
    return _client


class SpeechProvider(Protocol):
    @property
    def model(self) -> str: ...

    async def synthesize(self, text: str) -> bytes: ...


class AiHubMixSpeech:
    """OpenAI-compatible TTS over the AiHubMix `/v1` base URL."""

    def __init__(self, *, model: str | None = None, voice: str | None = None) -> None:
        self._model = model or settings.speech_tts_model
        self._voice = voice or settings.speech_tts_voice

    @property
    def model(self) -> str:
        return self._model

    async def synthesize(self, text: str) -> bytes:
        payload = {
            "model": self._model,
            "input": text[:MAX_INPUT_CHARS],
            "voice": self._voice,
            "response_format": _RESPONSE_FORMAT,
        }
        url = f"{settings.aihubmix_openai_base_url.rstrip('/')}/audio/speech"
        try:
            response = await _http().post(
                url,
                headers={"Authorization": f"Bearer {settings.aihubmix_api_key}"},
                json=payload,
            )
        except httpx.TimeoutException as exc:
            raise AITimeoutError("speech synthesis timed out", raw=exc) from exc
        except httpx.TransportError as exc:
            raise AITimeoutError("speech provider connection dropped", raw=exc) from exc

        if response.status_code >= 400:
            # A provider verdict (bad model name, quota) is terminal — surfaced as
            # a provider error so the frontend degrades to the browser voice.
            raise AIProviderError(
                f"speech provider returned HTTP {response.status_code}",
                raw=response.text[:500],
            )
        audio = response.content
        if not audio:
            raise AIProviderError("speech provider returned empty audio")
        return audio