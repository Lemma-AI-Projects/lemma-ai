"""AI orchestration layer (终稿: 政策自研, 执行用框架).

Public surface: the AIClient facade, the boundary types, and the runtime
init/shutdown pair for the FastAPI lifespan. Everything else is internal.

Import discipline (终稿 2.2): `pydantic_ai` / `openai` / `google.genai` are
imported only inside this package; services/, schemas/ and models/ see the
boundary types below and nothing framework-shaped.
"""

from ai.client import AIClient, ai_client
from ai.config import validate_routes
from ai.errors import (
    AIConfigError,
    AIError,
    AIFallbackExhausted,
    AIProviderError,
    AIRateLimitError,
    AITimeoutError,
    UnsupportedCapabilityError,
)
from ai.model_factory import init_http_client, shutdown_http_client
from ai.types import (
    AIChunk,
    AIResponse,
    AIUseCase,
    ChatMessage,
    ModelRoute,
    TokenUsage,
    VideoInput,
    VideoInputKind,
)


def init_ai_runtime() -> None:
    """Validate the routing table and open the shared HTTP client (lifespan startup)."""
    validate_routes()
    init_http_client()


async def shutdown_ai_runtime() -> None:
    """Close the shared HTTP client (lifespan shutdown)."""
    await shutdown_http_client()


__all__ = [
    "AIChunk",
    "AIClient",
    "AIConfigError",
    "AIError",
    "AIFallbackExhausted",
    "AIProviderError",
    "AIRateLimitError",
    "AIResponse",
    "AITimeoutError",
    "AIUseCase",
    "ChatMessage",
    "ModelRoute",
    "TokenUsage",
    "UnsupportedCapabilityError",
    "VideoInput",
    "VideoInputKind",
    "ai_client",
    "init_ai_runtime",
    "shutdown_ai_runtime",
]
