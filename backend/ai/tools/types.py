"""Boundary types for the function-calling tool foundation (决策⑩-a).

These are Lemma boundary types — NO framework (google.genai / pydantic_ai) tool
types appear here or anywhere outside ai/conversion.py. services/ provide tool
HANDLERS (closures over db / request context) bound to a ToolSpec; the AIClient
facade runs the tool loop and translates to/from the framework via conversion.

Adding a tool ≈ adding a use case: register a ToolSpec (declarations.py) + write
a service handler + bind them for the turn. The core loop never changes.
"""

from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass
from typing import Any, Literal

from pydantic import BaseModel, Field

from ai.types import VideoInput


class ToolSpec(BaseModel):
    """A function declaration the model may call. `parameters` is a JSON schema.

    result_kind discriminates how the handler's result re-enters the model:
    - "text"  -> a JSON function_response (standard tools: quiz / cards / search);
    - "media" -> the handler also returns a media VideoInput, injected as a
      user-turn media Part alongside the function_response (the video special
      case; media is never stuffed inside the function_response).
    """

    name: str
    description: str
    parameters: dict[str, Any] = Field(default_factory=dict)
    result_kind: Literal["text", "media"] = "text"


class ToolCall(BaseModel):
    """A model-issued call: tool name + parsed args (translated from the frame)."""

    name: str
    args: dict[str, Any] = Field(default_factory=dict)


class ToolProgress(BaseModel):
    """A progress signal a long-running handler yields before its result (e.g.
    the video tool while the chapter file uploads). Relayed as AIChunk(preparing)."""

    kind: Literal["preparing"] = "preparing"
    data: dict[str, Any] = Field(default_factory=dict)


class ToolResult(BaseModel):
    """A handler's terminal result.

    `response` is the JSON payload handed back as the function_response (always).
    `media` (media tools only) is a video injected as a user-turn media Part.
    """

    response: dict[str, Any] = Field(default_factory=dict)
    media: VideoInput | None = None


# A handler runs a tool call: yields zero or more ToolProgress, then exactly one
# ToolResult. Provided by services (closure over db/context); ai/ only invokes it.
ToolHandler = Callable[[ToolCall], AsyncIterator[ToolProgress | ToolResult]]


@dataclass
class ToolBinding:
    """A tool made available for one turn: its declaration + an injected handler."""

    spec: ToolSpec
    handler: ToolHandler
