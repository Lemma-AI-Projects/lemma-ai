"""Provider contracts for voice I/O.

Kept deliberately tiny so swapping Volcengine for Deepgram/Cartesia (v2
regional routing, E7) is a one-file change. No framework types leak here.
"""

from typing import Protocol, runtime_checkable


@runtime_checkable
class STTProvider(Protocol):
    """Speech-to-text. `audio_format` is a hint the provider maps to its own
    codec name (e.g. "wav" / "mp3" / "pcm")."""

    async def transcribe(self, audio: bytes, *, audio_format: str) -> str:
        """Return the recognized transcript (empty string if nothing heard)."""
        ...


@runtime_checkable
class TTSProvider(Protocol):
    """Text-to-speech. Returns raw audio bytes in the provider's default codec."""

    async def synthesize(self, text: str, *, voice_type: str) -> bytes:
        """Return synthesized audio bytes for `text`."""
        ...
