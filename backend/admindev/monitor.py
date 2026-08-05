"""Aggregated system probe for the dev dashboard (one endpoint, many sources).

Every probe is individually fault-tolerant: one dead component must never
blank the whole panel. Sources: in-process counters, Redis, Celery workers,
AI usage ledger (reused telemetry), Postgres, learner tables (gated).
"""

import sys
import time
from datetime import datetime, timedelta, timezone

from sqlalchemy import case, func as sa_func, select, text

from core.database import AsyncSessionLocal, engine
from core.config import settings
from models.ai_usage_log import AiUsageLog

_started_at = time.time()
_request_count = 0
_error_count = 0
_request_window: list[float] = []  # timestamps of the last 60s (RPS)


def note_request() -> None:
    global _request_count
    _request_count += 1
    now = time.time()
    _request_window.append(now)
    while _request_window and now - _request_window[0] > 60:
        _request_window.pop(0)


def note_error() -> None:
    global _error_count
    _error_count += 1


def _safe(fn, fallback: dict):
    try:
        return fn()
    except Exception as exc:  # noqa: BLE001 — probe must never crash the panel
        out = dict(fallback)
        out["status"] = "down"
        out["error"] = type(exc).__name__
        return out


def probe_process() -> dict:
    now = time.time()
    return {
        "status": "up",
        "uptime_s": int(now - _started_at),
        "requests_total": _request_count,
        "errors_total": _error_count,
        "rps_60s": len(_request_window),
        "python": sys.version.split()[0],
    }


def probe_redis() -> dict:
    import redis.asyncio as aioredis  # provided by celery[redis]

    async def _run():
        client = aioredis.from_url(settings.redis_url, socket_connect_timeout=2)
        try:
            await client.ping()
            dbsize = await client.dbsize()
            queue_depth = 0
            try:
                queue_depth = int(await client.llen("celery") or 0)
            except Exception:  # noqa: BLE001 — queue key may not exist
                pass
            return {"status": "up", "dbsize": dbsize, "queue_depth": queue_depth}
        finally:
            await client.aclose()

    return _safe(lambda: _run(), {"status": "down"})


def probe_celery() -> dict:
    import asyncio

    async def _run():
        from tasks.celery_app import celery_app  # lazy: heavy import

        loop = asyncio.get_running_loop()
        pong = await loop.run_in_executor(None, lambda: celery_app.control.inspect(timeout=3).ping())
        workers = sorted((pong or {}).keys())
        return {
            "status": "up" if workers else "down",
            "workers": workers,
            "worker_count": len(workers),
        }

    return _safe(lambda: _run(), {"status": "down", "workers": []})


def probe_db() -> dict:
    async def _run():
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "up"}
    return _safe(lambda: _run(), {"status": "down"})


def probe_ai_usage(hours: int = 24) -> dict:
    async def _run():
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        async with AsyncSessionLocal() as session:
            row = (
                await session.execute(
                    select(
                        sa_func.count(AiUsageLog.id),
                        sa_func.coalesce(sa_func.sum(AiUsageLog.cost_usd), 0),
                        sa_func.avg(AiUsageLog.latency_ms),
                        sa_func.sum(case((AiUsageLog.success.is_(True), 1), else_=0)),
                    ).where(AiUsageLog.created_at >= since)
                )
            ).one()
        total = int(row[0] or 0)
        cost = float(row[1] or 0)
        avg_latency = float(row[2]) if row[2] is not None else None
        success = int(row[3] or 0)
        return {
            "status": "up",
            "hours": hours,
            "calls": total,
            "cost_usd": round(cost, 4),
            "avg_latency_ms": round(avg_latency, 1) if avg_latency else None,
            "success_rate": round(success / total, 3) if total else None,
        }

    return _safe(lambda: _run(), {"status": "down"})


def probe_learner() -> dict:
    """Learner tables land with the M0 storage work; until then: not connected."""

    async def _run():
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1 FROM knowledge_nodes LIMIT 1"))
        return {"status": "up", "note": "learner tables reachable"}
    return _safe(
        lambda: _run(),
        {"status": "degraded", "note": "not connected (lands with M0 storage)"},
    )


async def collect() -> dict:
    """Everything the dashboard needs in one call."""
    process = probe_process()
    redis = await probe_redis()
    celery = await probe_celery()
    db = await probe_db()
    usage = await probe_ai_usage()
    learner = await probe_learner()
    return {
        "collected_at": int(time.time()),
        "process": process,
        "redis": redis,
        "celery": celery,
        "db": db,
        "ai_usage": usage,
        "learner": learner,
        "enabled": settings.dev_dashboard_enabled,
    }
