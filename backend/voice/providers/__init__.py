"""Voice I/O providers (STT / TTS). Swappable behind Protocols."""

from voice.providers.base import STTProvider, TTSProvider
from voice.providers.volc import VolcengineSTT, VolcengineTTS

__all__ = [
    "STTProvider",
    "TTSProvider",
    "VolcengineSTT",
    "VolcengineTTS",
]
