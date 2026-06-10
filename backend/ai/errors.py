"""Business error family + mapping from framework/SDK exceptions (终稿 6.1).

Framework exceptions never cross the ai/ boundary: the AIClient facade catches
them and re-raises the business errors below. Each error carries a stable
`code` the API layer and frontend can rely on; the original exception is kept
in `raw` for logs and must never be sent to the frontend.
"""

from typing import Any

from google.genai import errors as genai_errors
from pydantic_ai.exceptions import (
    FallbackExceptionGroup,
    ModelAPIError,
    ModelHTTPError,
    UnexpectedModelBehavior,
    UsageLimitExceeded,
)


class AIError(Exception):
    code = "ai_error"

    def __init__(self, message: str, *, raw: Any = None) -> None:
        super().__init__(message)
        self.message = message
        self.raw = raw


class AIConfigError(AIError):
    code = "ai_config_error"


class AIProviderError(AIError):
    code = "ai_provider_error"


class AITimeoutError(AIError):
    code = "ai_timeout"


class AIRateLimitError(AIError):
    code = "ai_rate_limited"


class UnsupportedCapabilityError(AIError):
    code = "ai_unsupported_capability"


class AIFallbackExhausted(AIError):
    code = "ai_fallback_exhausted"


def map_framework_error(exc: Exception) -> AIError:
    """Translate any exception escaping the execution layer into a business error."""
    if isinstance(exc, AIError):
        return exc

    if isinstance(exc, FallbackExceptionGroup):
        return AIFallbackExhausted("all AI fallback candidates failed", raw=exc)

    if isinstance(exc, ModelHTTPError):
        if exc.status_code == 429:
            return AIRateLimitError("AI provider rate limited the request", raw=exc)
        if exc.status_code in (408, 504):
            return AITimeoutError("AI provider timed out", raw=exc)
        return AIProviderError(
            f"AI provider returned HTTP {exc.status_code}", raw=exc
        )

    if isinstance(exc, (UsageLimitExceeded, UnexpectedModelBehavior)):
        return AIProviderError(str(exc), raw=exc)

    # google-genai exceptions from the native video channel (终稿 6.1 同表归一化).
    if isinstance(exc, genai_errors.APIError):
        status = getattr(exc, "code", None)
        if status == 429:
            return AIRateLimitError("AI provider rate limited the request", raw=exc)
        if status in (408, 504):
            return AITimeoutError("AI provider timed out", raw=exc)
        return AIProviderError(f"AI provider returned HTTP {status}", raw=exc)

    if isinstance(exc, TimeoutError):
        return AITimeoutError("AI request timed out", raw=exc)

    # pydantic-ai wraps SDK connection/timeout errors (openai APIConnectionError
    # and friends) into ModelAPIError, so this branch covers network failures.
    if isinstance(exc, ModelAPIError):
        message = exc.message.lower()
        if "timeout" in message or "timed out" in message:
            return AITimeoutError("AI request timed out", raw=exc)
        return AIProviderError("AI provider request failed", raw=exc)

    return AIProviderError("unexpected AI failure", raw=exc)
