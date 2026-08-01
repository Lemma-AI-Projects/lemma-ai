"""Experience telemetry — lever ⑥ of the backend architecture report.

Separate concern from the *billing* ledger in ai/usage.py: this measures the
user-perceived experience (time-to-first-token, fallback rate, degradation
rate), NOT cost. Sink is a structured JSON line on the `lemma.ai.telemetry`
log channel — no DB schema, no migration, consumed by the observability stack.

Purely additive: calling this never changes request behavior, and it must stay
that way (a telemetry hiccup must never break an AI response).
"""

from __future__ import annotations

import json
import logging

logger = logging.getLogger("lemma.ai.telemetry")


def emit_experience(
    tracker: "UsageTracker",
    *,
    route: "ModelRoute",
    success: bool,
    error_type: str | None,
    route_index: int,
) -> None:
    """Emit one experience event for a terminal accounting path.

    `tracker` is the ai/usage.UsageTracker (duck-typed: we only read fields).
    `route` is the route that produced this terminal event.
    """
    record = {
        "use_case": tracker.use_case.value,
        "trace_id": tracker.trace_id,
        "ttft_ms": tracker.ttft_ms,
        "total_ms": tracker.latency_ms,
        "fell_back": tracker.fell_back,
        "degraded": tracker.degraded,
        "success": success,
        "error_type": error_type,
        "route_index": route_index,
        "platform": route.platform,
        "model": route.model,
    }
    try:
        logger.info("ai_telemetry %s", json.dumps(record, ensure_ascii=False))
    except Exception:  # noqa: BLE001 — telemetry must never break the caller
        pass
