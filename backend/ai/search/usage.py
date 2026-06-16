"""Search-provider usage accounting (mirrors ai/usage.py).

Sink: a structured JSON log line + a row in provider_usage_logs. Kept separate
from ai_usage_logs on purpose — that ledger is token-priced LLM spend, this one
is per-actor / per-result search spend. Every call gets a row, success or
failure (a failed Apify run still costs money). A DB hiccup must never break a
search, so persistence failures are logged and swallowed.

cost_usd is filled only when the run reports it (Run.usage_total_usd); it is
never estimated — NULL means "the platform sent no figure".
"""

import json
import logging
import uuid
from decimal import Decimal

from core.database import AsyncSessionLocal
from models.provider_usage_log import ProviderUsageLog

logger = logging.getLogger("lemma.ai.search.usage")


async def record_provider_call(
    *,
    trace_id: str,
    provider: str,
    actor_id: str,
    platform: str,
    use_case: str,
    success: bool,
    latency_ms: int,
    result_count: int | None = None,
    cost_usd: Decimal | None = None,
    run_id: str | None = None,
    error_type: str | None = None,
    course_id: uuid.UUID | None = None,
) -> None:
    record = {
        "provider": provider,
        "actor_id": actor_id,
        "platform": platform,
        "use_case": use_case,
        "run_id": run_id,
        "result_count": result_count,
        "cost_usd": cost_usd,
        "latency_ms": latency_ms,
        "success": success,
        "error_type": error_type,
        "trace_id": trace_id,
    }
    logger.info("provider_usage %s", json.dumps(record, ensure_ascii=False, default=str))
    await _persist(record, course_id=course_id)


async def _persist(record: dict, *, course_id: uuid.UUID | None) -> None:
    try:
        row = ProviderUsageLog(**record, course_id=course_id)
        async with AsyncSessionLocal() as session:
            session.add(row)
            await session.commit()
    except Exception:  # noqa: BLE001 — the ledger must never break the search
        logger.exception(
            "failed to persist provider_usage_log row (trace_id=%s)",
            record["trace_id"],
        )
