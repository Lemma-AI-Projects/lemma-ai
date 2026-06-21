"""Tool declaration registry (既有注册位风格，仿 ai/config 路由表 / ai/agents).

Declarations (name / description / parameters / result_kind) are DATA registered
here, not hardcoded in business code. HANDLERS are injected by services at call
time (ai/ never imports services). Adding a tool = register a ToolSpec here +
write a service handler + bind them; the tool loop is untouched.
"""

from ai.tools.types import ToolSpec

# Tool names (the model calls these by name; keep stable).
LOAD_CHAPTER_VIDEO = "load_chapter_video"

_REGISTRY: dict[str, ToolSpec] = {
    LOAD_CHAPTER_VIDEO: ToolSpec(
        name=LOAD_CHAPTER_VIDEO,
        description=(
            "加载用户此刻正在观看的本章节视频，以便结合视频画面、板书与讲解来回答。"
            "当用户的问题需要看到视频内容才能准确解释时调用；纯概念性、与画面无关的"
            "问题无需调用。无需任何参数——始终加载用户当前正在看的那一章。"
        ),
        # Argless: the handler always loads the CURRENT chapter (request-scoped),
        # never a model-chosen one — enforces 「每轮取当前章、非粘性」.
        parameters={"type": "object", "properties": {}},
        result_kind="media",
    ),
}


def tool_spec(name: str) -> ToolSpec:
    spec = _REGISTRY.get(name)
    if spec is None:
        raise KeyError(f"unknown tool declaration '{name}'")
    return spec
