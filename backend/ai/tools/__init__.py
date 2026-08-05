"""Function-calling tool foundation (boundary types + declaration registry).

Framework tool types never appear here — only Lemma boundary types. The tool
loop lives in the AIClient facade; framework translation in ai/conversion.py.
"""

from ai.tools.declarations import (
    LOAD_CHAPTER_VIDEO,
    LOAD_SKILL,
    READ_CURRENT_GRAPH,
    RENDER_DESMOS_3D_GRAPH,
    RENDER_DESMOS_GRAPH,
    tool_spec,
)
from ai.tools.types import (
    ToolBinding,
    ToolCall,
    ToolHandler,
    ToolProgress,
    ToolResult,
    ToolSpec,
)

__all__ = [
    "LOAD_CHAPTER_VIDEO",
    "LOAD_SKILL",
    "READ_CURRENT_GRAPH",
    "RENDER_DESMOS_3D_GRAPH",
    "RENDER_DESMOS_GRAPH",
    "ToolBinding",
    "ToolCall",
    "ToolHandler",
    "ToolProgress",
    "ToolResult",
    "ToolSpec",
    "tool_spec",
]
