"""L1 S4 C3 工具 smoke：learner_state 注册 + handler + 门控剔除。

backend 惯例（smoke_*.py）：直接 python 运行，断言失败退出码非零。
覆盖：
  1. 门控关：build_global_tools 不含 learner_state（从 toolset 剔除，双门控）
  2. 门控开：含 learner_state，且 spec 注册正确
  3. handler 各 action 返回合法 JSON（5 action 全冒烟）
  4. 未知 action → 错误 JSON（工具循环内自愈，不抛异常）
"""
import asyncio
import os
import sys
import tempfile
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# 环境：门控开 + 独立 learner db（不污染默认库）
os.environ["LEMMA_HERMES_ENABLED"] = "true"
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
os.environ["LEMMA_HERMES_LEARNER_DB_URL"] = _tmp.name

from ai.tools.declarations import LEARNER_STATE, tool_spec  # noqa: E402
from services.conversation_tool_service import build_global_tools  # noqa: E402


def _tool_names(tools) -> set[str]:
    return {t.spec.name for t in tools}


async def _run_handler(handler, args: dict) -> dict:
    from ai.tools.types import ToolCall, ToolResult

    results = []
    async for item in handler(ToolCall(name=LEARNER_STATE, args=args)):
        results.append(item)
    assert results, "handler 必须产出结果"
    last = results[-1]
    assert isinstance(last, ToolResult), "最后结果必须是 ToolResult"
    return last.response


def main() -> None:
    uid = uuid.uuid4()
    tools = build_global_tools(user_id=uid, conversation_id=None)
    names = _tool_names(tools)

    # 1. 门控开：learner_state 已注册
    assert LEARNER_STATE in names, f"门控开缺 learner_state: {names}"
    spec = tool_spec(LEARNER_STATE)
    assert spec.name == LEARNER_STATE
    assert "action" in spec.parameters.get("properties", {}), "parameters 缺 action"
    assert "required" in spec.parameters and "action" in spec.parameters["required"]

    # 2. handler 5 action 全冒烟
    binding = next(t for t in tools if t.spec.name == LEARNER_STATE)
    handler = binding.handler

    r = asyncio.run(
        _run_handler(
            handler,
            {"action": "upsert_concept", "arguments": {"concept": "换元法", "success": False}},
        )
    )
    assert r["status"] == "ok" and r.get("node"), f"upsert_concept 失败: {r}"

    r = asyncio.run(
        _run_handler(
            handler,
            {"action": "record_episode", "arguments": {"goal": "理解换元法", "concept": "换元法"}},
        )
    )
    assert r["status"] == "ok" and r.get("episode"), f"record_episode 失败: {r}"

    r = asyncio.run(_run_handler(handler, {"action": "query_knowledge", "arguments": {}}))
    assert r["status"] == "ok" and isinstance(r.get("knowledge"), list), f"query_knowledge 失败: {r}"
    assert len(r["knowledge"]) >= 1, "换元法应已入库"

    r = asyncio.run(
        _run_handler(handler, {"action": "add_rule", "arguments": {"rule": "先讲直觉再讲证明"}})
    )
    assert r["status"] == "ok" and r.get("rule"), f"add_rule 失败: {r}"

    r = asyncio.run(_run_handler(handler, {"action": "due_reviews", "arguments": {"limit": 3}}))
    assert r["status"] == "ok" and "due" in r, f"due_reviews 失败: {r}"

    # 3. 未知 action → 错误 JSON（不抛异常）
    r = asyncio.run(_run_handler(handler, {"action": "hack_the_planet"}))
    assert r["status"] == "unknown_action", f"未知 action 应拒绝: {r}"

    # 4. 缺必填参数 → 错误 JSON（引擎侧校验）
    r = asyncio.run(_run_handler(handler, {"action": "upsert_concept", "arguments": {}}))
    assert r["status"] == "error", f"缺 concept 应报错: {r}"

    # 5. 门控关：工具剔除（子进程验证，settings 启动时读取）
    os.environ["LEMMA_HERMES_ENABLED"] = "false"
    code = (
        "import sys, uuid; sys.path.insert(0, '.');\n"
        "from services.conversation_tool_service import build_global_tools;\n"
        "names = {t.spec.name for t in build_global_tools(user_id=uuid.uuid4(), conversation_id=None)};\n"
        "assert 'learner_state' not in names, names;\n"
        "print('GATE_OFF_OK')"
    )
    import subprocess

    env = dict(os.environ)
    env["LEMMA_HERMES_ENABLED"] = "false"
    out = subprocess.run(
        [sys.executable, "-c", code], capture_output=True, text=True, env=env, cwd=Path(__file__).resolve().parents[1]
    )
    assert out.returncode == 0 and "GATE_OFF_OK" in out.stdout, f"门控关剔除失败: {out.stdout} {out.stderr}"

    print("S4 C3 TOOL SMOKE OK")


if __name__ == "__main__":
    main()
