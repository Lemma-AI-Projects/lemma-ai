"""Global conversation plugin tools (Desmos 2D/3D 四件套; future plugins land here).

Builds the per-turn ToolBindings shared by BOTH channels — chat_service
(pydantic-ai framework loop) and companion_service (native gemini loop). The
tool TRUTH is single: specs from ai/tools/declarations, handlers here,
validation in schemas/desmos.py; each channel only adapts dispatch.

The two Desmos render tools (2D / 3D) share ONE handler pipeline via
`_make_render_handler(config)` — gate, auto-teach, one-card rule, zero-trust
validation and persistence are maintained in a single place; a `RenderConfig`
per variant supplies the skill name, payload model and card type. Adding the
next Desmos variant (geometry, ...) is one more config + skill + declaration.

Handlers are closures over this turn's user/conversation context (ai/ never
imports services). All handlers share one mutable TurnToolContext:

- loaded_skills gates each render tool on ITS OWN skill: Pydantic can reject
  malformed payloads, but it cannot catch "valid yet quietly wrong" graphs
  (unescaped \\sin parses as s*i*n — plots fine, plots WRONG). Forcing the
  model to see the spec first shuts down that error class.
- card_emitted enforces 一轮一图 ACROSS variants (the message tool_json is a
  single card slot — one drawing per turn, be it 2D or 3D).
- last_graph_id lets read_current_graph see a graph rendered EARLIER IN THIS
  SAME TURN; otherwise it resolves through the persisted tool_json chain.

Handlers never raise for business failures — they return structured statuses
({"status": "rejected"/"invalid"/...}) so the model self-corrects inside the
tool loop instead of killing the stream.
"""

import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass, field

from pydantic import BaseModel, ValidationError

from ai import (
    LEARNER_STATE,
    LOAD_SKILL,
    READ_CURRENT_GRAPH,
    RENDER_DESMOS_3D_GRAPH,
    RENDER_DESMOS_GRAPH,
    ToolBinding,
    ToolCall,
    ToolProgress,
    ToolResult,
    tool_spec,
)
from ai.skills import skill_body, skill_names
from core.database import AsyncSessionLocal
from schemas.desmos import Desmos3DGraphPayload, DesmosGraphPayload
from services import desmos_graph_service

# L1 S4：learner_state 工具支持的 action 白名单（引擎 handle_action 1:1；
# 未知 action 由 handler 返回错误 JSON 而非抛异常——工具循环内自愈）。
_LEARNER_ACTIONS = frozenset(
    {
        "upsert_concept",
        "record_episode",
        "query_knowledge",
        "add_rule",
        "due_reviews",
    }
)


@dataclass
class TurnToolContext:
    loaded_skills: set[str] = field(default_factory=set)
    card_emitted: bool = False
    last_graph_id: uuid.UUID | None = None


@dataclass(frozen=True)
class RenderConfig:
    """Everything variant-specific about one Desmos render tool."""

    tool_name: str
    skill_name: str
    payload_model: type[BaseModel]
    card_type: str
    kind: str  # desmos_graphs.kind value


_RENDER_CONFIGS = (
    RenderConfig(
        tool_name=RENDER_DESMOS_GRAPH,
        skill_name="desmos-graphing",
        payload_model=DesmosGraphPayload,
        card_type="desmos_graph",
        kind="2d",
    ),
    RenderConfig(
        tool_name=RENDER_DESMOS_3D_GRAPH,
        skill_name="desmos-3d-graphing",
        payload_model=Desmos3DGraphPayload,
        card_type="desmos_3d_graph",
        kind="3d",
    ),
)

# kind -> the render tool that redraws graphs of that kind (read tool's note).
_RENDER_TOOL_BY_KIND = {
    config.kind: config.tool_name for config in _RENDER_CONFIGS
}
_SKILL_BY_KIND = {config.kind: config.skill_name for config in _RENDER_CONFIGS}


def _wrapped_spec(skill_name: str) -> str:
    """Skill body in the structured tag (官方实现指南: content identification)."""
    return (
        f'<skill_content name="{skill_name}">\n'
        f"{skill_body(skill_name)}\n"
        f"</skill_content>"
    )


def build_global_tools(
    *, user_id: uuid.UUID, conversation_id: uuid.UUID | None
) -> list[ToolBinding]:
    """The plugin ToolBindings for one turn.

    conversation_id is None only when the conversation row may not exist yet
    (new conversation's first turn) — graphs are then created unlinked and the
    message tool_json carries the link (course_planning precedent).
    """
    ctx = TurnToolContext()

    # ── L1 S4：learner 记忆读写（C3 工具）───────────────────────────────────
    # 门控开才注册（get_learner_service() 非 None）；门控关 => 从 toolset 剔除，
    # 模型看不到这个工具——双门控（功能 + 工具）可回滚。
    def build_learner_binding() -> ToolBinding | None:
        from services.learner.learner_service import get_learner_service

        svc = get_learner_service()
        if svc is None:
            return None
        spec = tool_spec(LEARNER_STATE)

        async def learner_handler(
            call: ToolCall,
        ) -> AsyncIterator[ToolProgress | ToolResult]:
            action = str(call.args.get("action") or "")
            if action not in _LEARNER_ACTIONS:
                yield ToolResult(
                    response={
                        "status": "unknown_action",
                        "available": sorted(_LEARNER_ACTIONS),
                    }
                )
                return
            args = call.args.get("arguments") or {}
            if not isinstance(args, dict):
                yield ToolResult(
                    response={"status": "error", "error": "arguments must be an object"}
                )
                return
            result = svc.handle_action(str(user_id), action, **args)
            if not result.get("success"):
                yield ToolResult(
                    response={
                        "status": "error",
                        "error": result.get("error", "unknown error"),
                    }
                )
                return
            yield ToolResult(response={"status": "ok", **result})

        return ToolBinding(spec=spec, handler=learner_handler)

    async def load_skill_handler(
        call: ToolCall,
    ) -> AsyncIterator[ToolProgress | ToolResult]:
        name = str(call.args.get("skill", ""))
        if name not in skill_names():
            yield ToolResult(
                response={"status": "unknown_skill", "available": skill_names()}
            )
            return
        ctx.loaded_skills.add(name)
        yield ToolResult(response={"status": "loaded", "skill": _wrapped_spec(name)})

    def make_render_handler(config: RenderConfig):
        async def render_handler(
            call: ToolCall,
        ) -> AsyncIterator[ToolProgress | ToolResult]:
            if config.skill_name not in ctx.loaded_skills:
                # 门禁 + 自动补课：不是干拒（真跑观察到模型被拒后会放弃并让
                # 用户"稍等"），而是把本工具的规范全文直接递回去，让下一轮就
                # 能按规范重试——自愈从两步缩为一步，token 成本相同。
                ctx.loaded_skills.add(config.skill_name)
                yield ToolResult(
                    response={
                        "status": "spec_required",
                        "spec": _wrapped_spec(config.skill_name),
                        "instruction": (
                            "本次调用未执行。上面是绘图参数规范：请立即按规范"
                            f"检查/修正你的参数，并重新调用 {config.tool_name} "
                            "完成绘图。不要询问用户、不要说稍等。"
                        ),
                    }
                )
                return
            if ctx.card_emitted:
                yield ToolResult(
                    response={
                        "status": "rejected",
                        "reason": "每个回答最多画一张图；请在讲解中使用已生成的图",
                    }
                )
                return
            try:
                payload = config.payload_model.model_validate(call.args)
            except ValidationError as exc:
                yield ToolResult(
                    response={
                        "status": "invalid",
                        "errors": [
                            {
                                "loc": ".".join(str(part) for part in error["loc"]),
                                "msg": error["msg"],
                            }
                            for error in exc.errors()
                        ],
                    }
                )
                return
            async with AsyncSessionLocal() as db:
                graph = await desmos_graph_service.create_graph(
                    db,
                    user_id=user_id,
                    conversation_id=conversation_id,
                    ai_params=payload.model_dump(by_alias=True, exclude_none=True),
                    kind=config.kind,
                )
            ctx.card_emitted = True
            ctx.last_graph_id = graph.id
            yield ToolResult(
                response={"status": "created", "graphId": str(graph.id)},
                card={"type": config.card_type, "graphId": str(graph.id)},
            )

        return render_handler

    async def read_handler(
        call: ToolCall,
    ) -> AsyncIterator[ToolProgress | ToolResult]:
        graph_id = ctx.last_graph_id
        if graph_id is None and conversation_id is not None:
            async with AsyncSessionLocal() as db:
                graph_id = await desmos_graph_service.find_latest_graph_id(
                    db, conversation_id=conversation_id
                )
        if graph_id is None:
            yield ToolResult(response={"status": "no_graph"})
            return
        async with AsyncSessionLocal() as db:
            snapshot = await desmos_graph_service.read_graph_snapshot(
                db, user_id=user_id, graph_id=graph_id
            )
        if snapshot is None:
            yield ToolResult(response={"status": "no_graph"})
            return
        kind = str(snapshot.get("kind", "2d"))
        render_tool = _RENDER_TOOL_BY_KIND.get(kind, RENDER_DESMOS_GRAPH)
        response: dict = {
            "status": "ok",
            **snapshot,
            # 防"只读当成已改"幻觉（真跑观察到：模型 read 完直接宣布改好了）：
            # 把下一步指令放在离模型决策最近的位置——函数返回值里。
            "note": (
                f"这只是当前图（kind={kind}）的快照，图并未被修改。要完成修改，"
                f"必须立即调用 {render_tool} 输出完整的新图参数。在该调用成功"
                "返回之前，绝对不要声称图已修改。"
            ),
        }
        skill_name = _SKILL_BY_KIND.get(kind)
        if skill_name is not None and skill_name not in ctx.loaded_skills:
            # 读图九成是为了改图：把对应 kind 的规范直接搭在快照上，改图链路
            # 从三步（read -> 补课 -> render）缩成两步，消除中途放弃的窗口。
            ctx.loaded_skills.add(skill_name)
            response["spec"] = _wrapped_spec(skill_name)
        yield ToolResult(response=response)

    return [
        ToolBinding(spec=tool_spec(LOAD_SKILL), handler=load_skill_handler),
        *(
            ToolBinding(
                spec=tool_spec(config.tool_name),
                handler=make_render_handler(config),
            )
            for config in _RENDER_CONFIGS
        ),
        ToolBinding(spec=tool_spec(READ_CURRENT_GRAPH), handler=read_handler),
        *([learner_binding] if (learner_binding := build_learner_binding()) else []),
    ]
