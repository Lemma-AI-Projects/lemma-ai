"""Boundary types for the function-calling tool foundation (决策⑩-a).

These are Lemma boundary types — NO framework (pydantic_ai) tool types appear
here or anywhere outside ai/conversion.py. services/ provide tool HANDLERS
(closures over db / request context) bound to a ToolSpec; the AIClient facade
runs the tool loop and translates to/from the framework via conversion.

Adding a tool ≈ adding a use case: register a ToolSpec (declarations.py) + write
a service handler + bind them for the turn. The core loop never changes.
"""

from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, Field


class ToolSpec(BaseModel):
    """A function declaration the model may call. `parameters` is a JSON schema."""

    name: str
    description: str
    parameters: dict[str, Any] = Field(default_factory=dict)


class ToolCall(BaseModel):
    """A model-issued call: tool name + parsed args (translated from the frame)."""

    name: str
    args: dict[str, Any] = Field(default_factory=dict)


class ToolResult(BaseModel):
    """A handler's terminal result.

    `response` is the JSON payload handed back as the function_response (always).
    `card` is a wire-ready (camelCase) payload for the FRONTEND: the tool loop
    relays it as AIChunk(kind="tool") -> SSE `tool` event, attaching an
    interactive card to the turn (e.g. {"type": "desmos_graph", "graphId": ...}).
    Two audiences, two channels: `response` goes to the model, `card` to the
    user — a card never rides inside the function_response.
    """

    response: dict[str, Any] = Field(default_factory=dict)
    card: dict[str, Any] | None = None


# A handler runs a tool call and yields exactly one ToolResult. Provided by
# services (closure over db/context); ai/ only invokes it.
ToolHandler = Callable[[ToolCall], AsyncIterator[ToolResult]]


@dataclass
class ToolBinding:
    """A tool made available for one turn: its declaration + an injected handler."""

    spec: ToolSpec
    handler: ToolHandler
