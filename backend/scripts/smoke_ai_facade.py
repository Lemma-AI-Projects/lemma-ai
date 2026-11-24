"""门面级冒烟（回归集 12.2 的 1/2/4 项雏形）。

跑法（backend/ 目录下）:
    uv run python scripts/smoke_ai_facade.py

链路: ai_client.chat -> 查 ai_usage_logs 确认成功台账落了库。
探针脚本测的是裸通道；这里测的是 services 实际会走的门面 + 落库。
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from ai import init_ai_runtime, shutdown_ai_runtime
from ai.client import ai_client
from ai.types import AIUseCase, ChatMessage
from core.database import AsyncSessionLocal
from models.ai_usage_log import AiUsageLog


async def _ledger_rows(use_case: str) -> list[AiUsageLog]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(AiUsageLog)
            .where(AiUsageLog.use_case == use_case)
            .order_by(AiUsageLog.created_at.desc())
            .limit(3)
        )
        return list(result.scalars())


async def main() -> int:
    init_ai_runtime()
    failures = 0
    try:
        # 1) 文本门面
        response = await ai_client.chat(
            AIUseCase.TEXT_CHAT,
            [ChatMessage(role="user", content="用三个字回答：1+1=?")],
        )
        print(f"chat: [{response.platform}/{response.model}] {response.text!r} "
              f"usage={response.usage.total_tokens}")

        # 2) 台账落库
        rows = await _ledger_rows("text_chat")
        newest = rows[0] if rows else None
        if newest is None or not newest.success:
            failures += 1
            print("FAIL: ai_usage_logs 无 text_chat 成功行")
        else:
            print(
                f"ledger[text_chat]: trace={newest.trace_id[:8]} "
                f"{newest.platform}/{newest.actual_model} "
                f"tokens={newest.total_tokens} latency={newest.latency_ms}ms "
                f"success={newest.success}"
            )
    finally:
        await shutdown_ai_runtime()

    print("SMOKE " + ("FAILED" if failures else "OK"))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
