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
LOAD_POINT_VIDEO = "load_point_video"
LOAD_SKILL = "load_skill"
RENDER_DESMOS_GRAPH = "render_desmos_graph"
RENDER_DESMOS_3D_GRAPH = "render_desmos_3d_graph"
READ_CURRENT_GRAPH = "read_current_graph"
# Space Context (资料层): the space's own material — read it, and add to it.
READ_PAGE = "read_page"
SAVE_NOTE = "save_note"
# Space Memory: what this space should still know in a conversation that has not
# happened yet. Not the same thing as a note — a note is material, a memory is
# a conclusion the two of you reached.
REMEMBER = "remember"

_REGISTRY: dict[str, ToolSpec] = {
    LOAD_POINT_VIDEO: ToolSpec(
        name=LOAD_POINT_VIDEO,
        description=(
            "加载用户此刻正在观看的学习点视频，以便结合视频画面、板书与讲解来回答。"
            "当用户的问题需要看到视频内容才能准确解释时调用；纯概念性、与画面无关的"
            "问题无需调用。无需任何参数——始终加载用户当前正在看的那个学习点。"
        ),
        # Argless: the handler always loads the CURRENT point (request-scoped),
        # never a model-chosen one — enforces 「每轮取当前学习点、非粘性」.
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
    READ_PAGE: ToolSpec(
        name=READ_PAGE,
        description=(
            "读取学习者某个空间里一块板块的正文。系统提示里的空间清单只有标题和类型，"
            "没有正文。只要回答需要用到某块板的实际内容（解释、引用、比较、总结），"
            "就必须先调用本工具把正文取回来；取不到时说清取不到，绝不要根据标题猜内容。"
            "参数 page 传板块标题或它的 id。若返回 ambiguous，说明标题对上了多块板，"
            "把候选告诉用户或改用 id 重试，不要自己挑一个。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "page": {
                    "type": "string",
                    "description": "板块的标题或 id",
                }
            },
            "required": ["page"],
        },
    ),
    SAVE_NOTE: ToolSpec(
        name=SAVE_NOTE,
        description=(
            "把一段结论存成当前空间里的一篇新笔记，之后它会出现在空间清单里、也能被"
            "read_page 读到。用户说「把这个存下来」「记到空间里」「帮我记一下」这类话时"
            "调用。本工具只能新建，不会改动用户已有的板。调用成功后必须把返回的标题"
            "念给用户确认；没有成功返回就绝不要说已经存好了。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "笔记标题（简短，一行）",
                },
                "content": {
                    "type": "string",
                    "description": "笔记正文（Markdown，可含小标题与列表）",
                },
            },
            "required": ["title", "content"],
        },
    ),
    REMEMBER: ToolSpec(
        name=REMEMBER,
        description=(
            "把一件「以后还得记得」的事记进当前空间，让未来**另一个对话**里的你能"
            "接得上。适合：用户做出的决定、定下的计划、说过的偏好或取舍（例："
            "「先解决 A，暂时不做 B」）。不适合：闲聊、过程、一次性的问题、"
            "任何关于他会不会的内容判断。\n"
            "写法：一到两句；**脱离这次对话也看得懂** —— 不要写「刚才那个」「上面提到"
            "的」，把对象写全。\n"
            "用户明确让你记住某事，或你们刚达成一个以后仍然成立的结论时调用。"
            "调用成功后，必须在回答里把记下的内容说一遍让用户看见；"
            "没有成功返回就绝不要说已经记住了。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "这条记忆本身，一到两句，脱离上下文也看得懂",
                },
            },
            "required": ["text"],
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
