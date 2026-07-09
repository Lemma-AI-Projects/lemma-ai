"""Global conversation plugin tools (Desmos 三件套; future plugins land here).

Builds the per-turn ToolBindings shared by BOTH channels — chat_service
(pydantic-ai framework loop) and companion_service (native gemini loop). The
tool TRUTH is single: specs from ai/tools/declarations, handlers here,
validation in schemas/desmos.py; each channel only adapts dispatch.

Handlers are closures over this turn's user/conversation context (ai/ never
imports services). All three share one mutable TurnToolContext:

- skill_loaded gates render_desmos_graph: Pydantic can reject malformed
  payloads, but it cannot catch "valid yet quietly wrong" graphs (unescaped
  \\sin parses as s*i*n — plots fine, plots WRONG). Forcing the model to read
  the spec first shuts down that whole error class for one extra round-trip.
- card_emitted enforces 一轮一图 (the message tool_json is a single card slot).
- last_graph_id lets read_current_graph see a graph rendered EARLIER IN THIS
  SAME TURN; otherwise it resolves through the persisted tool_json chain.

Handlers never raise for business failures — they return structured statuses
({"status": "rejected"/"invalid"/...}) so the model self-corrects inside the
tool loop instead of killing the stream.
"""

import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass

from pydantic import ValidationError

from ai import (
    LOAD_SKILL,
    READ_CURRENT_GRAPH,
    RENDER_DESMOS_GRAPH,
    ToolBinding,
    ToolCall,
    ToolProgress,
    ToolResult,
    tool_spec,
)
from ai.skills import skill_body, skill_names
from core.database import AsyncSessionLocal
from schemas.desmos import DesmosGraphPayload
from services import desmos_graph_service


@dataclass
class TurnToolContext:
    skill_loaded: bool = False
    card_emitted: bool = False
    last_graph_id: uuid.UUID | None = None


def build_global_tools(
    *, user_id: uuid.UUID, conversation_id: uuid.UUID | None
) -> list[ToolBinding]:
    """The plugin ToolBindings for one turn.

    conversation_id is None only when the conversation row may not exist yet
    (new conversation's first turn) — graphs are then created unlinked and the
    message tool_json carries the link (course_planning precedent).
    """
    ctx = TurnToolContext()

    async def load_skill_handler(
        call: ToolCall,
    ) -> AsyncIterator[ToolProgress | ToolResult]:
        name = str(call.args.get("skill", ""))
        if name not in skill_names():
            yield ToolResult(
                response={"status": "unknown_skill", "available": skill_names()}
            )
            return
        ctx.skill_loaded = True
        # Structured wrapping (官方实现指南): the model can tell spec content
        # apart from conversation content.
        yield ToolResult(
            response={
                "status": "loaded",
                "skill": (
                    f'<skill_content name="{name}">\n'
                    f"{skill_body(name)}\n"
                    f"</skill_content>"
                ),
            }
        )

    async def render_handler(
        call: ToolCall,
    ) -> AsyncIterator[ToolProgress | ToolResult]:
        if not ctx.skill_loaded:
            # 门禁 + 自动补课：不是干拒（真跑观察到模型被拒后会放弃并让用户
            # "稍等"），而是把规范全文直接递回去，让下一轮就能按规范重试——
            # 自愈从两步（load_skill -> render）缩为一步，token 成本相同。
            ctx.skill_loaded = True
            yield ToolResult(
                response={
                    "status": "spec_required",
                    "spec": (
                        '<skill_content name="desmos-graphing">\n'
                        f'{skill_body("desmos-graphing")}\n'
                        "</skill_content>"
                    ),
                    "instruction": (
                        "本次调用未执行。上面是绘图参数规范：请立即按规范检查/"
                        "修正你的参数，并重新调用 render_desmos_graph 完成绘图。"
                        "不要询问用户、不要说稍等。"
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
            payload = DesmosGraphPayload.model_validate(call.args)
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
            )
        ctx.card_emitted = True
        ctx.last_graph_id = graph.id
        yield ToolResult(
            response={"status": "created", "graphId": str(graph.id)},
            card={"type": "desmos_graph", "graphId": str(graph.id)},
        )

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
        response: dict = {
            "status": "ok",
            **snapshot,
            # 防"只读当成已改"幻觉（真跑观察到：模型 read 完直接宣布改好了）：
            # 把下一步指令放在离模型决策最近的位置——函数返回值里。
            "note": (
                "这只是当前图的快照，图并未被修改。要完成修改，必须立即调用 "
                "render_desmos_graph 输出完整的新图参数。在该调用成功返回之前，"
                "绝对不要声称图已修改。"
            ),
        }
        if not ctx.skill_loaded:
            # 读图九成是为了改图：把规范直接搭在快照上，改图链路从三步
            # （read -> 补课 -> render）缩成两步，消除中途放弃的窗口。
            ctx.skill_loaded = True
            response["spec"] = (
                '<skill_content name="desmos-graphing">\n'
                f'{skill_body("desmos-graphing")}\n'
                "</skill_content>"
            )
        yield ToolResult(response=response)

    return [
        ToolBinding(spec=tool_spec(LOAD_SKILL), handler=load_skill_handler),
        ToolBinding(spec=tool_spec(RENDER_DESMOS_GRAPH), handler=render_handler),
        ToolBinding(spec=tool_spec(READ_CURRENT_GRAPH), handler=read_handler),
    ]
