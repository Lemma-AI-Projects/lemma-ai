"""Boundary types shared with services/, schemas/ and models/.

This module is the only AI vocabulary the rest of the backend is allowed to
see. Framework types (ModelMessage, RunUsage, AgentRunResult, ...) must never
leak out of ai/ — conversion.py translates at the boundary.
"""

from enum import StrEnum
from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class AIUseCase(StrEnum):
    TEXT_CHAT = "text_chat"
    VISION_CHAT = "vision_chat"


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str | list[dict[str, Any]]


class TokenUsage(BaseModel):
    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None
    reasoning_tokens: int | None = None
    raw: dict[str, Any] = Field(default_factory=dict)


class AIResponse(BaseModel):
    text: str
    reasoning_text: str | None = None
    platform: str
    # Actual model that answered. After a fallback this can differ from the
    # primary route; response metadata wins over the routing table.
    model: str
    usage: TokenUsage | None = None


class AIStructuredResponse(BaseModel, Generic[T]):
    output: T
    reasoning_text: str | None = None
    platform: str
    model: str
    usage: TokenUsage | None = None


class StructuredStreamEvent(BaseModel, Generic[T]):
    """One typed event from AIClient.stream_generate (streamed structured gen).

    Counterpart to AIChunk for the structured path: instead of text deltas it
    streams the THINKING track, then hands back the validated output.

    - reasoning -> an incremental thinking delta (the visible "thinking" track);
    - result    -> the final validated structured output (terminal, success);
    - error     -> a mapped business error code/message (terminal, failure).

    Exactly one terminal event (result or error) ends the stream. `usage` is
    carried on the result event for callers that want it.
    """

    kind: Literal["reasoning", "result", "error"]
    reasoning_text: str | None = None
    result: T | None = None
    usage: TokenUsage | None = None
    error_code: str | None = None
    error_message: str | None = None


class AIChunk(BaseModel):
    """One typed streaming event from the AIClient facade.

    services/ subscribe to these for persistence; the API layer encodes them
    to SSE via ai/streaming.py. Exactly one terminal event ends every stream:
    done (success) or error (failure — possibly after some deltas).
    """

    kind: Literal["delta", "reasoning", "usage", "done", "error", "tool"]
    # delta
    text: str | None = None
    # reasoning: internal-only thinking delta/full text, not exposed over SSE yet
    reasoning_text: str | None = None
    # usage
    usage: TokenUsage | None = None
    # done: framework-serialized turn (schema-tagged) for ai_messages.raw_parts_json
    raw_parts: dict[str, Any] | None = None
    # error
    error_code: str | None = None
    error_message: str | None = None
    # tool: a wire-ready (camelCase) payload attaching a tool card to this turn,
    # e.g. {"type": "desmos_graph", "graphId": "<uuid>"}. Lemma-owned, not
    # framework-shaped; the frontend renders the matching tool block.
    tool: dict[str, Any] | None = None


class ModelRoute(BaseModel):
    platform: str  # "aihubmix" / "openrouter"
    adapter: str  # "openai_compatible" / "openrouter"
    model: str
    # Lower number wins; multiple routes for one use case form a fallback chain.
    priority: int = 0
    timeout_s: float = 30
    # Platform-specific passthrough, e.g. openrouter_models / openrouter_provider.
    extra: dict[str, Any] = Field(default_factory=dict)
