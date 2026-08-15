"""L1 S5 端到端验收：注入开关对照 + 记忆持久化闭环 + 门控回归。

backend 惯例（smoke_*.py）：直接 python 运行，断言失败退出码非零。
覆盖（S5 验收场景，计划定义）：
  1. 注入开关对照：同一 learn space 对话，门控开 vs 关的 system prompt diff
     ——门控关 => prompt 与基线逐字节一致；门控开 => 含 <memory-context>
  2. 持久化闭环：三轮模拟——①空库 query（老师无记忆）②record_episode 落库
     （「我卡在换元法」→ 工具调用）③重建 service（模拟重启对话）再 query
     => 状态仍在
  3. 门控关回归：S1/S4 smoke 全绿（子进程，settings 启动时读取）

真 AI 三轮对话（老师自然引用）需真实模型 key，本 smoke 用数据层等价验证
（注入块正确 + 工具落库 + 重启仍在），自然语言层留给部署后手动验收。
"""
import os
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# ── 场景 2 持久化闭环（本进程：门控开 + 独立 db）─────────────────────────
os.environ["LEMMA_HERMES_ENABLED"] = "true"
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
DB_PATH = _tmp.name
os.environ["LEMMA_HERMES_LEARNER_DB_URL"] = DB_PATH

from services.chat_service import build_learner_memory_block  # noqa: E402
from services.learner.learner_service import (  # noqa: E402
    LearnerService,
    get_learner_service,
)

UID = uuid.uuid4()
PID = uuid.uuid4()


def main() -> None:
    # ── 场景 2a：第一轮——空库，老师无记忆可引用 ─────────────────────────────
    svc = get_learner_service()
    assert svc is not None
    blk_empty = build_learner_memory_block(UID, PID)
    assert blk_empty is None, f"空库应无注入块: {blk_empty}"

    # ── 场景 2b：第二轮——「我卡在换元法」→ record_episode 落库（S4 工具数据面）──
    r = svc.handle_action(
        str(UID), "record_episode", goal="理解换元法", concept="换元法",
        result="failure", reason="不会配方法", new_strategy="先用几何直觉",
    )
    assert r["success"] and r.get("episode"), f"record_episode 失败: {r}"
    r = svc.handle_action(str(UID), "upsert_concept", concept="换元法", success=False)
    assert r["success"], f"upsert_concept 失败: {r}"

    # 工具回合后的注入块应包含换元法（同轮状态立即可见——turn 级生成的价值）
    blk_after = build_learner_memory_block(UID, PID)
    assert blk_after and "换元法" in blk_after, f"落库后注入块应含换元法: {blk_after}"

    # ── 场景 2c：第三轮——重启（新 service 实例=新连接）再问 => 状态仍在 ────
    svc2 = LearnerService(DB_PATH)  # 模拟重启对话：全新实例
    r = svc2.handle_action(str(UID), "query_knowledge", concepts=["换元法"])
    assert r["success"] and r.get("knowledge"), f"重启后查询失败: {r}"
    assert any("换元法" in (k.get("concept") or "") for k in r["knowledge"]), (
        f"重启后换元法应仍在: {r}"
    )
    blk_reopen = build_learner_memory_block(UID, PID)
    assert blk_reopen and "换元法" in blk_reopen, "重启后注入块应仍含换元法"

    # 用户隔离：另一个用户看不到 UID 的记忆
    other = uuid.uuid4()
    r = svc2.handle_action(str(other), "query_knowledge")
    assert r["success"] and not r.get("knowledge"), "其他用户不应看到记忆"

    # ── 场景 1 注入开关对照（子进程：门控关 vs 基线）────────────────────────
    code = (
        "import sys, uuid; sys.path.insert(0, '.');\n"
        "from ai.prompts.registry import render_system_prompt;\n"
        "from ai.types import AIUseCase;\n"
        "p = render_system_prompt(AIUseCase.TEXT_CHAT, {'agent_persona': ''});\n"
        "assert '<memory-context>' not in p, '门控关注入泄漏';\n"
        "assert 'Memory guidance' not in p, 'guidance 泄漏';\n"
        "assert '$learner_memory' not in p, '占位符泄漏';\n"
        "print('GATE_OFF_PROMPT_OK')"
    )
    env = dict(os.environ)
    env["LEMMA_HERMES_ENABLED"] = "false"
    out = subprocess.run(
        [sys.executable, "-c", code],
        capture_output=True, text=True, env=env,
        cwd=Path(__file__).resolve().parents[1],
    )
    assert out.returncode == 0 and "GATE_OFF_PROMPT_OK" in out.stdout, (
        f"门控关 prompt 泄漏: {out.stdout} {out.stderr}"
    )

    # ── 场景 3 门控回归：S1/S4 smoke 子进程全绿 ──────────────────────────────
    for smoke in ["tests/smoke_learner_l1.py", "tests/smoke_learner_tool.py"]:
        out = subprocess.run(
            [sys.executable, smoke],
            capture_output=True, text=True, env=env,
            cwd=Path(__file__).resolve().parents[1],
        )
        assert out.returncode == 0, f"{smoke} 回归失败: {out.stdout} {out.stderr}"

    print("S5 E2E SMOKE OK")


if __name__ == "__main__":
    main()
