"""Tool declaration registry (既有注册位风格，仿 ai/config 路由表 / ai/agents).

Declarations (name / description / parameters / result_kind) are DATA registered
here, not hardcoded in business code. HANDLERS are injected by services at call
time (ai/ never imports services). Adding a tool = register a ToolSpec here +
write a service handler + bind them; the tool loop is untouched.

Parameter schemas are deliberately LOOSE top-level shapes: providers don't
strictly enforce FunctionDeclaration schemas (and deep $ref/anyOf nesting is a
compatibility minefield), so the schema is a hint for the model — the thick
field rules live in the skill body, and the VERDICT is the Pydantic validation
in the service handler (FC schema 是提示、skill 是教材、Pydantic 是法律).
"""

from functools import lru_cache

from ai.skills import catalog
from ai.tools.types import ToolSpec

# Tool names (the model calls these by name; keep stable).
LOAD_CHAPTER_VIDEO = "load_chapter_video"
LOAD_SKILL = "load_skill"
RENDER_DESMOS_GRAPH = "render_desmos_graph"
READ_CURRENT_GRAPH = "read_current_graph"

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
    RENDER_DESMOS_GRAPH: ToolSpec(
        name=RENDER_DESMOS_GRAPH,
        description=(
            "渲染一张可交互的 Desmos 函数图卡片给用户（函数曲线、不等式阴影、"
            "滑块、可拖拽点、极坐标、参数方程）。首次使用前必须先调用 load_skill "
            "加载 desmos-graphing 技能获取完整参数规范；每个回答最多调用一次。"
        ),
        # Loose top-level shape only — expression-level field rules live in the
        # desmos-graphing skill; schemas/desmos.py is the enforcement.
        parameters={
            "type": "object",
            "properties": {
                "expressions": {
                    "type": "array",
                    "description": "表达式列表（字段规范见 desmos-graphing 技能）",
                    "items": {"type": "object"},
                },
                "mathBounds": {
                    "type": "object",
                    "description": "初始视口 {left,right,bottom,top}（数字）",
                },
                "degreeMode": {"type": "boolean"},
                "polarMode": {"type": "boolean"},
                "xAxisLabel": {"type": "string"},
                "yAxisLabel": {"type": "string"},
            },
            "required": ["expressions"],
        },
    ),
    READ_CURRENT_GRAPH: ToolSpec(
        name=READ_CURRENT_GRAPH,
        description=(
            "读取本会话最新一张 Desmos 图的当前表达式内容（包含用户手动编辑后的"
            "最新状态）。用户要求修改之前画的图时，必须先调用本工具了解现状。"
            "注意：本工具只读不改——图不会自动更新，读取后必须再调用 "
            "render_desmos_graph 输出完整的新图参数才算完成修改。无需任何参数。"
        ),
        parameters={"type": "object", "properties": {}},
    ),
}


def tool_spec(name: str) -> ToolSpec:
    if name == LOAD_SKILL:
        return _load_skill_spec()
    spec = _REGISTRY.get(name)
    if spec is None:
        raise KeyError(f"unknown tool declaration '{name}'")
    return spec


@lru_cache(maxsize=1)
def _load_skill_spec() -> ToolSpec:
    """The skill-activation tool, built from the registry at first use.

    Level-1 progressive disclosure: the CATALOG (name + description per skill)
    is embedded in this tool's description — the single injection point, so no
    prompt template ever grows a skills section. The `skill` parameter is an
    enum over discovered names (官方实现指南: constrain to valid names so the
    model can't hallucinate a skill).
    """
    skills = catalog()
    lines = "\n".join(
        f"- {skill.name}: {skill.description}" for skill in skills
    )
    return ToolSpec(
        name=LOAD_SKILL,
        description=(
            "加载一项技能的完整使用说明。以下技能可用；当任务匹配某项技能的"
            "描述时，先调用本工具加载其说明，再按说明行动：\n" + lines
        ),
        parameters={
            "type": "object",
            "properties": {
                "skill": {
                    "type": "string",
                    "enum": [skill.name for skill in skills],
                    "description": "要加载的技能名",
                }
            },
            "required": ["skill"],
        },
    )
