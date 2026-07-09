"""Desmos 工具链冒烟（skills + 三件套 + 门禁 + 零信任校验 + 真跑）。

跑法（backend/ 目录下）:
    uv run python scripts/smoke_desmos_tool.py            # 离线部分
    uv run python scripts/smoke_desmos_tool.py --live     # 加真跑（需要 .env 与 DB）

离线部分不碰网络/DB（handler 的落库通过传入假 user 前会被门禁/校验拦下的路径验证）；
--live 用真实用户跑一轮「画抛物线」的完整工具循环（load_skill -> render -> 收尾），
断言 desmos_graphs 落库 + 卡片 chunk + 台账。
"""

import asyncio
import sys
import uuid
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pydantic import ValidationError

failures = 0


def check(name: str, ok: bool, detail: str = "") -> None:
    global failures
    print(f"{'OK  ' if ok else 'FAIL'} {name}" + (f" — {detail}" if detail else ""))
    if not ok:
        failures += 1


def offline_registry() -> None:
    from ai.skills import catalog, skill_body, validate_skills

    validate_skills()
    skills = catalog()
    check("registry: desmos-graphing 被发现", any(s.name == "desmos-graphing" for s in skills))
    body = skill_body("desmos-graphing")
    check("registry: 正文含关键规范", "一轮一图" in body and "\\\\sin" in body)


def offline_declarations() -> None:
    from ai import LOAD_SKILL, READ_CURRENT_GRAPH, RENDER_DESMOS_GRAPH, tool_spec

    load = tool_spec(LOAD_SKILL)
    check(
        "declarations: load_skill enum + catalog 内嵌",
        load.parameters["properties"]["skill"]["enum"] == ["desmos-graphing"]
        and "desmos-graphing" in load.description,
    )
    render = tool_spec(RENDER_DESMOS_GRAPH)
    check(
        "declarations: render 宽松 schema",
        render.parameters["required"] == ["expressions"]
        and "load_skill" in render.description,
    )
    check(
        "declarations: read 无参",
        tool_spec(READ_CURRENT_GRAPH).parameters == {"type": "object", "properties": {}},
    )


def offline_payload_validation() -> None:
    from schemas.desmos import DesmosGraphPayload

    valid = {
        "expressions": [
            {"id": "slider_a", "latex": "a=1",
             "sliderBounds": {"min": "-3", "max": "3", "step": ""}},
            {"id": "parabola", "latex": "y=ax^2", "color": "BLUE"},
            {"latex": "(a,a^2)", "label": "P", "lineStyle": "SOLID"},
        ],
        "mathBounds": {"left": -5, "right": 5, "bottom": -2, "top": 8},
        "degreeMode": False,
    }
    payload = DesmosGraphPayload.model_validate(valid)
    check("payload: 合法样例通过", payload.expressions[1].color == "BLUE")

    bad_cases = {
        "空表达式": {"expressions": []},
        "非法色名": {"expressions": [{"latex": "y=x", "color": "CYAN"}]},
        "非法 id": {"expressions": [{"latex": "y=x", "id": "直线A"}]},
        "重复 id": {"expressions": [{"latex": "y=x", "id": "a"}, {"latex": "y=2x", "id": "a"}]},
        "视口翻转": {"expressions": [{"latex": "y=x"}],
                   "mathBounds": {"left": 5, "right": -5, "bottom": 0, "top": 1}},
        "未知字段": {"expressions": [{"latex": "y=x", "lineWidth": 5}]},
        "latex 超长": {"expressions": [{"latex": "x" * 501}]},
    }
    for name, case in bad_cases.items():
        try:
            DesmosGraphPayload.model_validate(case)
            check(f"payload: 拒绝 {name}", False)
        except ValidationError:
            check(f"payload: 拒绝 {name}", True)


async def offline_gate_behavior() -> None:
    """门禁与一轮一图：不触网、不落库（在校验/门禁处即被拦下）。"""
    from ai.tools.types import ToolCall, ToolResult
    from services.conversation_tool_service import build_global_tools

    tools = build_global_tools(user_id=uuid.uuid4(), conversation_id=None)
    by_name = {binding.spec.name: binding.handler for binding in tools}

    async def run(name: str, args: dict[str, Any]) -> dict[str, Any]:
        result: ToolResult | None = None
        async for event in by_name[name](ToolCall(name=name, args=args)):
            if isinstance(event, ToolResult):
                result = event
        assert result is not None
        return result.response

    # 未加载技能就 render -> spec_required（自动补课：规范全文随错误递回）
    resp = await run("render_desmos_graph", {"expressions": [{"latex": "y=x"}]})
    check(
        "门禁: 未 load_skill 时递规范",
        resp.get("status") == "spec_required"
        and "<skill_content" in resp.get("spec", ""),
        str(resp)[:100],
    )

    # 加载不存在的技能 -> unknown_skill
    resp = await run("load_skill", {"skill": "nope"})
    check("门禁: 未知技能名被拒", resp.get("status") == "unknown_skill")

    # 正常加载
    resp = await run("load_skill", {"skill": "desmos-graphing"})
    check(
        "load_skill: 返回结构化正文",
        resp.get("status") == "loaded"
        and "<skill_content" in resp.get("skill", ""),
    )

    # 加载后 render 非法载荷 -> invalid + errors（模型可自愈）
    resp = await run("render_desmos_graph", {"expressions": [{"latex": "y=x", "color": "PINK"}]})
    check(
        "零信任: 非法载荷返回结构化错误",
        resp.get("status") == "invalid" and bool(resp.get("errors")),
        str(resp)[:120],
    )

    # 无图时 read -> no_graph
    resp = await run("read_current_graph", {})
    check("read: 无图返回 no_graph", resp.get("status") == "no_graph")


async def live_round() -> None:
    """真跑：主聊天通道一轮画图（需要 .env 的模型 key 与 DB）。"""
    from sqlalchemy import select

    from ai import init_ai_runtime, shutdown_ai_runtime
    from ai.client import ai_client
    from ai.types import AIUseCase, ChatMessage
    from core.database import AsyncSessionLocal, engine
    from models.desmos_graph import DesmosGraph
    from models.profile import Profile
    from services.conversation_tool_service import build_global_tools

    init_ai_runtime()
    try:
        async with AsyncSessionLocal() as db:
            user_id = (await db.execute(select(Profile.id).limit(1))).scalar_one_or_none()
        if user_id is None:
            check("live: 需要至少一个 profile", False, "库中无用户，跳过")
            return

        tools = build_global_tools(user_id=user_id, conversation_id=None)
        kinds: list[str] = []
        cards: list[dict[str, Any]] = []
        text_parts: list[str] = []
        async for chunk in ai_client.stream_chat(
            AIUseCase.TEXT_CHAT,
            [ChatMessage(role="user", content="画一个 y=ax^2，让我能拖动 a 看开口变化")],
            user_id=str(user_id),
            tools=tools,
        ):
            kinds.append(chunk.kind)
            if chunk.kind == "tool" and chunk.tool:
                cards.append(chunk.tool)
            elif chunk.kind == "delta" and chunk.text:
                text_parts.append(chunk.text)

        check(
            "live: 卡片 + done 事件序",
            len(cards) == 1
            and cards[0].get("type") == "desmos_graph"
            and kinds[-1] == "done",
            f"kinds={kinds}",
        )
        graph_id = uuid.UUID(cards[0]["graphId"]) if cards else None
        if graph_id is not None:
            async with AsyncSessionLocal() as db:
                graph = await db.get(DesmosGraph, graph_id)
            ok = graph is not None and bool(graph.ai_params_json.get("expressions"))
            has_slider = ok and any(
                "sliderBounds" in expr
                for expr in graph.ai_params_json["expressions"]
            )
            check("live: desmos_graphs 落库且含滑块", bool(ok and has_slider),
                  str(graph.ai_params_json)[:200] if graph else "no row")
            print("live text:", "".join(text_parts)[:120].replace("\n", " "))
    finally:
        await shutdown_ai_runtime()
        await engine.dispose()


async def main() -> int:
    offline_registry()
    offline_declarations()
    offline_payload_validation()
    await offline_gate_behavior()
    if "--live" in sys.argv:
        await live_round()
    print("SMOKE " + ("FAILED" if failures else "OK"))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
