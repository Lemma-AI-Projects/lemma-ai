"""Function-calling tool foundation (boundary types + declaration registry).

Framework tool types never appear here — only Lemma boundary types. The tool
loop lives in the AIClient facade; framework translation in ai/conversion.py.
"""

from ai.tools.declarations import (
    LOAD_POINT_VIDEO,
    LOAD_SKILL,
    PROPOSE_HOME_PREFERENCE,
    READ_CURRENT_GRAPH,
    RECORD_EVIDENCE,
    READ_PAGE,
    REMEMBER,
    RENDER_DESMOS_3D_GRAPH,
    RENDER_DESMOS_GRAPH,
    SAVE_NOTE,
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
    "LOAD_POINT_VIDEO",
    "LOAD_SKILL",
    "PROPOSE_HOME_PREFERENCE",
    "READ_CURRENT_GRAPH",
    "RECORD_EVIDENCE",
    "READ_PAGE",
    "REMEMBER",
    "RENDER_DESMOS_3D_GRAPH",
    "RENDER_DESMOS_GRAPH",
    "SAVE_NOTE",
    "ToolBinding",
    "ToolCall",
    "ToolHandler",
    "ToolProgress",
    "ToolResult",
    "ToolSpec",
    "tool_spec",
]
