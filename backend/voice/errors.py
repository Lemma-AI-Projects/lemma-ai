"""Voice-module exceptions."""


class VoiceError(Exception):
    """Base class for voice-layer errors."""


class VoiceConfigError(VoiceError):
    """Raised when voice is enabled but credentials are missing."""


class VoiceProviderError(VoiceError):
    """Raised when an upstream STT / TTS provider call fails."""
