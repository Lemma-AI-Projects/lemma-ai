"""探针 1-2（终稿 12.1）— 文本轨通道验证。

跑法（backend/ 目录下）:
    uv run python scripts/validate_ai_channels.py

文本轨（1-2，混合方案中止线）:
  对 text_chat 每条路由逐平台单测（绕过 FallbackModel）:
  [非流式] 回答非空 + usage 三件套完整
  [流式]   增量 >= 2 + 拼接非空 + 流末 usage 完整
  [OpenRouter 加测] provider_details 含 cost

任一硬性检查失败 -> 退出码 1。打印的 token 数用于与平台账单对账。
"""

import asyncio
import sys
import time
from pathlib import Path

# Standalone script: put backend/ on sys.path so top-level imports (ai, core) resolve.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pydantic_ai.messages import ModelMessage, ModelResponse

from ai import init_ai_runtime, shutdown_ai_runtime
from ai.agents import LemmaDeps, text_chat_agent
from ai.config import routes_for
from ai.model_factory import build_model
from ai.types import AIUseCase, ModelRoute

PROMPT = "用一句话回答：天空为什么是蓝色的？"
# 流式探针用长回答：短回答可能被服务端缓冲成单包，导致 chunks>=2 误报。
STREAM_PROMPT = "分三点解释天空为什么是蓝色的，每点用一句完整的话。"
DEPS = LemmaDeps(
    system_prompt="You are a concise assistant. Answer in one short sentence."
)
STREAM_DEPS = LemmaDeps(
    system_prompt="You are a helpful assistant. Follow the user's format exactly."
)


class CheckFailure(Exception):
    pass


def _check(condition: bool, label: str, detail: str = "") -> None:
    if not condition:
        raise CheckFailure(f"{label}{f' ({detail})' if detail else ''}")


def _usage_summary(usage) -> str:  # noqa: ANN001 — framework RunUsage, probe-internal
    return (
        f"input={usage.input_tokens} output={usage.output_tokens} "
        f"total={usage.total_tokens}"
    )


def _last_response(messages: list[ModelMessage]) -> ModelResponse | None:
    for message in reversed(messages):
        if isinstance(message, ModelResponse):
            return message
    return None


# ---------------------------------------------------------------- 探针 1-2 文本轨


async def probe_non_stream(route: ModelRoute) -> str:
    model = build_model(route)
    result = await text_chat_agent.run(PROMPT, model=model, deps=DEPS)
    usage = result.usage

    _check(bool(result.output.strip()), "非流式回答为空")
    _check(usage.input_tokens > 0, "input_tokens 缺失", _usage_summary(usage))
    _check(usage.output_tokens > 0, "output_tokens 缺失", _usage_summary(usage))
    _check(usage.total_tokens > 0, "total_tokens 缺失", _usage_summary(usage))

    response = _last_response(result.new_messages())
    actual_model = response.model_name if response else None
    return f"text[{len(result.output)}字] {_usage_summary(usage)} actual_model={actual_model}"


async def probe_stream(route: ModelRoute) -> str:
    model = build_model(route)
    chunks = 0
    text = ""
    async with text_chat_agent.run_stream(
        STREAM_PROMPT, model=model, deps=STREAM_DEPS
    ) as stream:
        # debounce_by=None: 关闭合包，数到的就是真实增量个数
        async for delta in stream.stream_text(delta=True, debounce_by=None):
            chunks += 1
            text += delta
        usage = stream.usage
        messages = stream.all_messages()

    _check(bool(text.strip()), "流式拼接文本为空")
    _check(chunks >= 2, "流式增量不足 2 个，疑似整包返回", f"chunks={chunks}")
    _check(
        usage.input_tokens > 0 and usage.output_tokens > 0 and usage.total_tokens > 0,
        "流式 usage 不完整",
        _usage_summary(usage),
    )

    extra = ""
    if route.platform == "openrouter":
        response = _last_response(messages)
        details = dict(response.provider_details or {}) if response else {}
        _check(
            "cost" in details,
            "openrouter_usage 未生效：provider_details 无 cost",
            f"keys={sorted(details)}",
        )
        extra = f" cost=${details['cost']}"
    return f"chunks={chunks} text[{len(text)}字] {_usage_summary(usage)}{extra}"


async def run_text_probes() -> int:
    failures = 0
    routes = routes_for(AIUseCase.TEXT_CHAT)
    print(f"text_chat 共 {len(routes)} 条路由，逐平台单测（绕过 FallbackModel）\n")
    for index, route in enumerate(routes, start=1):
        for mode, probe in (("非流式", probe_non_stream), ("流式", probe_stream)):
            label = f"探针 {index} [{route.platform} / {route.model}] {mode}"
            failures += await _run_one(label, probe(route))
    return failures


# ---------------------------------------------------------------------- 驱动


async def _run_one(label: str, coroutine) -> int:  # noqa: ANN001
    started = time.monotonic()
    try:
        detail = await coroutine
    except CheckFailure as exc:
        print(f"FAIL  {label} — {exc}")
        return 1
    except Exception as exc:  # noqa: BLE001 — 探针要如实报告一切异常
        print(f"FAIL  {label} — {type(exc).__name__}: {exc}")
        return 1
    elapsed_ms = int((time.monotonic() - started) * 1000)
    print(f"PASS  {label} — {detail} [{elapsed_ms}ms]")
    return 0


async def main() -> int:
    init_ai_runtime()
    try:
        text_failures = await run_text_probes()
    finally:
        await shutdown_ai_runtime()

    print()
    print(
        "文本轨(1-2): " + ("全过 — 混合方案成立" if text_failures == 0 else f"{text_failures} 项失败 — 触发中止线（终稿裁决 6）")
    )
    return 1 if text_failures else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
