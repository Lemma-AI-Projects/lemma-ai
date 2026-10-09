"""Speech usage accounting — the same `ai_usage_logs` ledger as the LLM calls.

Kept in its own module rather than folded into `ai/usage.py` because that one is
built around a tracker keyed by `AIUseCase` + `ModelRoute`, which speech
deliberately does not use (plan §2.1). The write itself mirrors
`ai/search/usage.py`: a structured log line + one row, and a DB hiccup is
swallowed so accounting can never break a synthesis.

TTS is billed **per input character**, not per token, so the row carries the
character count in `raw_usage` and sets `usage_missing=True` — the ledger's
"the platform sent no token figure" flag. `cost_usd` stays NULL (never guessed).
"""

import asyncio
import json
import logging
import uuid

from core.database import AsyncSessionLocal
from models.ai_usage_log import AiUsageLog

logger = logging.getLogger("lemma.ai.speech.usage")

# Doubles as the ledger's `use_case` label. Not an AIUseCase member on purpose:
# speech is not on the routing table, and a plain string is what the column is.
USE_CASE = "free_course_tts"
_PLATFORM = "aihubmix"
_ADAPTER = "openai_compatible"


async def record_speech_call(
    *,
    trace_id: str,
    model: str,
    chars: int,
    success: bool,
    latency_ms: int,
    user_id: str | None = None,
    error_type: str | None = None,
) -> None:
    record = {
        "use_case": USE_CASE,
        "platform": _PLATFORM,
        "adapter": _ADAPTER,
        "route_model": model,
        "actual_model": model if success else None,
        "input_tokens": None,
        "output_tokens": None,
        "total_tokens": None,
        "raw_usage": {"chars": chars, "billing_unit": "characters"},
        "cost_usd": None,
        "latency_ms": latency_ms,
        "request_id": None,
        "trace_id": trace_id,
        "fallback_attempt": 0,
        "success": success,
        "error_type": error_type,
        "usage_missing": True,
    }
    logger.info("speech_usage %s", json.dumps(record, ensure_ascii=False, default=str))
    await _persist(record, user_id=user_id)


async def _persist(record: dict, *, user_id: str | None) -> None:
    try:
        row = AiUsageLog(
            **record,
            user_id=uuid.UUID(user_id) if user_id else None,
            conversation_id=None,
        )
        # Hard cap: awaited inline on the synthesis path, so a dead connection
        # must cost seconds, not a TCP timeout (mirrors ai/usage.py — 15s because
        # a task's first write pays the cold-connect path).
        async with asyncio.timeout(15):
            async with AsyncSessionLocal() as session:
                session.add(row)
                await session.commit()
    except Exception:  # noqa: BLE001 — the ledger must never break synthesis
        logger.exception(
            "failed to persist ai_usage_log row (trace_id=%s)", record["trace_id"]
        )