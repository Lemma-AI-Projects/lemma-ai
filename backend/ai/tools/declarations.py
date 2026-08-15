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
RENDER_DESMOS_3D_GRAPH = "render_desmos_3d_graph"
READ_CURRENT_GRAPH = "read_current_graph"
LEARNER_STATE = "learner_state"

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
    RENDER_DESMOS_3D_GRAPH: ToolSpec(
        name=RENDER_DESMOS_3D_GRAPH,
        description=(
            "渲染一张可交互的 Desmos 3D 立体图卡片给用户（三维曲面、空间点与"
            "曲线、球坐标方程、参数曲面、旋转体、滑块）。首次使用前必须先调用 "
            "load_skill 加载 desmos-3d-graphing 技能获取完整参数规范；每个回答"
            "最多画一张图。二维平面图请用 render_desmos_graph。"
        ),
        # Loose top-level shape only — field rules live in the 3D skill;
        # schemas/desmos.py (Desmos3DGraphPayload) is the enforcement.
        # No zAxisLabel: the 3D settings surface only exposes x/y labels
        # (verified in-browser 2026-07-09).
        parameters={
            "type": "object",
            "properties": {
                "expressions": {
                    "type": "array",
                    "description": "表达式列表（字段规范见 desmos-3d-graphing 技能）",
                    "items": {"type": "object"},
                },
                "degreeMode": {"type": "boolean"},
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
            "最新状态），返回值的 kind 字段标明它是 2D 还是 3D 图。用户要求修改"
            "之前画的图时，必须先调用本工具了解现状。注意：本工具只读不改——图"
            "不会自动更新，读取后必须再调用与 kind 匹配的 render 工具"
            "（render_desmos_graph / render_desmos_3d_graph）输出完整的新图参数"
            "才算完成修改。无需任何参数。"
        ),
        parameters={"type": "object", "properties": {}},
    ),
    # ── L1 S4：learner 记忆读写（C3 工具，2026-08-15）──────────────────────
    # 引擎 LearnerCore.handle_action 的 action 制封装：一个工具、多个 action
    # （upsert_concept / record_episode / query_knowledge / add_rule / due_reviews）。
    # 参数 schema 刻意松（FC schema 是提示、skill 是教材、Pydantic 是法律）：
    # handler 侧对 action 白名单 + 必填字段做硬校验，非法调用返回错误 JSON。
    LEARNER_STATE: ToolSpec(
        name=LEARNER_STATE,
        description=(
            "读写学习者的记忆状态（概念掌握 / 学习过程记录 / 规则偏好 / 复习调度）。"
            "动作（action）与参数：\n"
            "- upsert_concept：更新概念掌握度。参数 concept（概念名，必填）、"
            "success（本次是否答对，bool）、domain（领域，默认 general）、"
            "exposed（是否暴露给学习者，默认 false）。\n"
            "- record_episode：记录一次学习过程。参数 goal（目标，必填）、"
            "concept / plugin / method / result（partial|success|failure，默认 "
            "partial）/ reason / new_strategy（均可选）。\n"
            "- query_knowledge：查询概念掌握状态。参数 concepts（概念名数组，"
            "可空——空则返回最近记录）。\n"
            "- add_rule：记录一条教学规则偏好。参数 rule（规则文本，必填）、"
            "source（来源，默认 manual）。\n"
            "- due_reviews：查询到期的复习项。参数 limit（数量，默认 5）。\n"
            "用途：老师自然引用学习者历史状态（无需点明在读记录）；学习者明确"
            "表达困惑/卡点/偏好时，调用对应 action 把状态记下来。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": [
                        "upsert_concept",
                        "record_episode",
                        "query_knowledge",
                        "add_rule",
                        "due_reviews",
                    ],
                },
                "arguments": {
                    "type": "object",
                    "description": "各 action 的参数对象（见 description）。",
                },
            },
            "required": ["action"],
        },
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
