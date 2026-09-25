"""XKW call ledger (mirrors ai/search/usage.py).

Sink: a structured JSON log line + a qbank_usage_logs row. A DB hiccup must
never break a call, so persistence failures are logged and swallowed.
"""

import asyncio
import json
import logging
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime

from sqlalchemy import func, select

from core.database import AsyncSessionLocal
from models.qbank_usage_log import QbankUsageLog

logger = logging.getLogger("lemma.qbank.usage")


@dataclass
class UsageRecord:
    provider: str
    endpoint: str
    use_case: str
    trace_id: str
    success: bool
    billable: bool
    latency_ms: int
    http_status: int | None = None
    raw_code: int | None = None
    result_count: int | None = None
    error_type: str | None = None
    request_id: str | None = None
    session_id: str | None = None
    user_id: str | None = None
    question_set_id: str | None = None


def _uuid_or_none(value: str | None) -> uuid.UUID | None:
    if not value:
        return None
    try:
        return uuid.UUID(value)
    except ValueError:
        return None


async def record_call(record: UsageRecord) -> None:
    logger.info("qbank_usage %s", json.dumps(asdict(record), ensure_ascii=False))
    try:
        row = QbankUsageLog(
            **{
                **asdict(record),
                "user_id": _uuid_or_none(record.user_id),
                "question_set_id": _uuid_or_none(record.question_set_id),
            }
        )
        async with asyncio.timeout(15):
            async with AsyncSessionLocal() as session:
                session.add(row)
                await session.commit()
    except Exception:  # noqa: BLE001 — the ledger must never break the call
        logger.exception(
            "failed to persist qbank_usage_log row (trace_id=%s)", record.trace_id
        )


async def count_billable_calls_since(since: datetime, *, provider: str = "xkw") -> int:
    """Billable XKW calls since `since` (global daily cap)."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(func.count(QbankUsageLog.id)).where(
                QbankUsageLog.provider == provider,
                QbankUsageLog.billable.is_(True),
                QbankUsageLog.created_at >= since,
            )
        )
        return int(result.scalar_one())
