"""pydantic-ai 工具通道风险闸门（Desmos 接入前置验证）。

跑法（backend/ 目录下）:
    uv run python scripts/smoke_pyai_tools.py

验证四件事（plan: pyai-smoke）:
1. Tool.from_schema 宽松 JSON schema 注入（框架跳过参数校验 -> Pydantic 判决可行）
2. agent.iter() 节点迭代：ModelRequestNode 流式 delta + CallToolsNode 工具事件
3. aihubmix OpenAI 兼容层对 gemini 的 FC 透传（text_chat route[0]）
4. openrouter 的 FC 兜底（text_chat route[1]）

每个平台跑一轮「模型必须调用 record_answer 工具再收尾」的对话；断言工具
被调用、参数以 keywords 原样到达 handler、工具结果后模型继续产出文本。
"""

import asyncio
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pydantic_ai import Agent
from pydantic_ai.tools import Tool
from pydantic_ai.toolsets import FunctionToolset
from pydantic_ai.usage import UsageLimits

from ai import init_ai_runtime, shutdown_ai_runtime
from ai.config import routes_for
from ai.model_factory import build_model
from ai.types import AIUseCase

# 宽松顶层 schema（与 Desmos 规划一致的风格：顶层形状 + 自由内层）。
_ANSWER_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "value": {"type": "integer", "description": "计算结果"},
        "note": {"type": "string", "description": "一句话备注"},
    },
    "required": ["value"],
}


async def _run_one(label: str, route_index: int) -> bool:
    routes = routes_for(AIUseCase.TEXT_CHAT)
    if route_index >= len(routes):
        print(f"[{label}] SKIP: 路由表没有第 {route_index} 条")
        return True
    route = routes[route_index]
    model = build_model(route)

    calls: list[dict[str, Any]] = []

    async def record_answer(**kwargs: Any) -> dict[str, Any]:
        calls.append(kwargs)
        return {"status": "recorded"}

    tool = Tool.from_schema(
        record_answer,
        name="record_answer",
        description="记录计算结果。回答任何算术问题前必须先调用本工具。",
        json_schema=_ANSWER_SCHEMA,
    )
    toolset = FunctionToolset(tools=[tool])
    agent: Agent[None, str] = Agent(model=model, instructions="回答前必须调用 record_answer 工具记录结果。")

    deltas: list[str] = []
    tool_call_events = 0
    tool_result_events = 0

    async with agent.iter(
        "17 + 25 等于多少？",
        toolsets=[toolset],
        usage_limits=UsageLimits(request_limit=4),
    ) as run:
        async for node in run:
            if Agent.is_model_request_node(node):
                async with node.stream(run.ctx) as stream:
                    async for event in stream:
                        kind = getattr(event, "event_kind", "")
                        if kind == "part_delta":
                            delta = getattr(event.delta, "content_delta", None)
                            if isinstance(delta, str) and delta:
                                deltas.append(delta)
            elif Agent.is_call_tools_node(node):
                async with node.stream(run.ctx) as stream:
                    async for event in stream:
                        kind = getattr(event, "event_kind", "")
                        if kind == "function_tool_call":
                            tool_call_events += 1
                        elif kind == "function_tool_result":
                            tool_result_events += 1

        output = run.result.output if run.result else ""

    text = "".join(deltas)
    ok = bool(calls) and calls[0].get("value") == 42 and ("42" in output or "42" in text)
    print(
        f"[{label}] {route.platform}/{route.model} -> "
        f"tool_calls={len(calls)} args={calls[0] if calls else None} "
        f"call_events={tool_call_events} result_events={tool_result_events} "
        f"deltas={len(deltas)} output={output[:60]!r} {'OK' if ok else 'FAIL'}"
    )
    return ok


async def _run_facade() -> bool:
    """AIClient.stream_chat(tools=...) 全链路：delta/tool(card)/usage/done 事件序。"""
    from collections.abc import AsyncIterator

    from ai.client import ai_client
    from ai.tools.types import ToolBinding, ToolCall, ToolProgress, ToolResult, ToolSpec
    from ai.types import ChatMessage

    calls: list[dict[str, Any]] = []

    async def handler(call: ToolCall) -> AsyncIterator[ToolProgress | ToolResult]:
        calls.append(call.args)
        yield ToolResult(
            response={"status": "recorded"},
            card={"type": "smoke_card", "value": call.args.get("value")},
        )

    binding = ToolBinding(
        spec=ToolSpec(
            name="record_answer",
            description="记录计算结果。回答任何算术问题前必须先调用本工具。",
            parameters=_ANSWER_SCHEMA,
        ),
        handler=handler,
    )

    kinds: list[str] = []
    cards: list[dict[str, Any]] = []
    text_parts: list[str] = []
    async for chunk in ai_client.stream_chat(
        AIUseCase.TEXT_CHAT,
        [ChatMessage(role="user", content="17 + 25 等于多少？")],
        tools=[binding],
    ):
        kinds.append(chunk.kind)
        if chunk.kind == "delta" and chunk.text:
            text_parts.append(chunk.text)
        elif chunk.kind == "tool" and chunk.tool:
            cards.append(chunk.tool)

    text = "".join(text_parts)
    ok = (
        bool(calls)
        and len(cards) == 1
        and cards[0]["type"] == "smoke_card"
        and kinds[-1] == "done"
        and "usage" in kinds
        and kinds.index("tool") < kinds.index("done")
        and "42" in text
    )
    print(
        f"[facade] calls={calls} cards={cards} kinds={kinds} "
        f"text={text[:60]!r} {'OK' if ok else 'FAIL'}"
    )
    return ok


async def main() -> int:
    init_ai_runtime()
    failures = 0
    try:
        if not await _run_one("aihubmix-compat", 0):
            failures += 1
        if not await _run_one("openrouter", 1):
            failures += 1
        if not await _run_facade():
            failures += 1
    finally:
        await shutdown_ai_runtime()
    print("SMOKE " + ("FAILED" if failures else "OK"))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
