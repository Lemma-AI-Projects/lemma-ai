"""Usage accounting (终稿 6.2 full field list).

Sink: structured JSON log line + a row in ai_usage_logs (the ledger). A DB
hiccup must never break an AI response, so persistence failures are logged
and swallowed.

Three accounting paths, none optional (rules 第八章: failures cost money too):
1. success          -> record_success() in the AIClient facade
2. failed attempt   -> record_failure() from the FallbackModel fallback_on hook
3. broken stream    -> finalize_stream() in the facade's finally block

The tracker travels in a ContextVar so the fallback hook (called deep inside
the framework, with no request arguments) can still attribute failures to the
right request and route.
"""

import asyncio
import json
import logging
import time
import uuid
from contextvars import ContextVar
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

from core.database import AsyncSessionLocal
from models.ai_usage_log import AiUsageLog

from ai.telemetry import emit_experience
from ai.types import AIUseCase, ModelRoute, TokenUsage

logger = logging.getLogger("lemma.ai.usage")


def estimate_tokens(char_count: int) -> int:
    """Crude chars/4 estimate used only when a provider omits usage data."""
    return max(char_count // 4, 1) if char_count else 0


@dataclass
class UsageTracker:
    trace_id: str
    use_case: AIUseCase
    routes: tuple[ModelRoute, ...]
    user_id: str | None = None
    conversation_id: str | None = None
    started_at: float = field(default_factory=time.monotonic)
    # Failed attempts so far == index of the route currently being tried,
    # because the fallback chain is ordered by route priority.
    failed_attempts: int = 0
    recorded_failures: int = 0
    finished: bool = False

    # Experience telemetry (lever ⑥): timestamp of the first output token, and
    # whether this turn ended on a degraded path. `degraded` is only ever set
    # True once the graceful-degradation ladder (lever ②) lands.
    first_token_at: float | None = None
    degraded: bool = False

    @property
    def current_route(self) -> ModelRoute:
        index = min(self.failed_attempts, len(self.routes) - 1)
        return self.routes[index]

    @property
    def latency_ms(self) -> int:
        return int((time.monotonic() - self.started_at) * 1000)

    @property
    def ttft_ms(self) -> int | None:
        """Time-to-first-token in ms, or None if no token was ever produced."""
        if self.first_token_at is None:
            return None
        return int((self.first_token_at - self.started_at) * 1000)

    @property
    def fell_back(self) -> bool:
        """True if at least one route was tried and failed before success."""
        return self.failed_attempts > 0

    def mark_first_token(self) -> None:
        """Record the first token's arrival (idempotent). Call from the facade."""
        if self.first_token_at is None:
            self.first_token_at = time.monotonic()


_tracker_var: ContextVar[UsageTracker | None] = ContextVar(
    "lemma_ai_usage_tracker", default=None
)


def start_tracking(
    use_case: AIUseCase,
    routes: tuple[ModelRoute, ...],
    *,
    user_id: str | None = None,
    conversation_id: str | None = None,
) -> UsageTracker:
    tracker = UsageTracker(
        trace_id=uuid.uuid4().hex,
        use_case=use_case,
        routes=routes,
        user_id=user_id,
        conversation_id=conversation_id,
    )
    _tracker_var.set(tracker)
    return tracker


def current_tracker() -> UsageTracker | None:
    return _tracker_var.get()


async def record_failure(
    tracker: UsageTracker, *, error: Exception, will_fallback: bool
) -> None:
    """One row per failed attempt, written BEFORE switching to the next route."""
    route = tracker.current_route
    await _emit(
        tracker,
        route=route,
        success=False,
        error_type=type(error).__name__,
        actual_model=getattr(error, "model_name", None),
        usage=None,
        usage_missing=True,
        request_id=None,
    )
    tracker.recorded_failures += 1
    if will_fallback:
        tracker.failed_attempts += 1
    else:
        tracker.finished = True


async def ensure_failure_recorded(tracker: UsageTracker, *, error: Exception) -> None:
    """Facade-level catch: record the failure unless the fallback hook already did."""
    if tracker.finished:
        return
    if tracker.recorded_failures == 0:
        await record_failure(tracker, error=error, will_fallback=False)
    tracker.finished = True


async def record_success(
    tracker: UsageTracker,
    *,
    usage: TokenUsage,
    actual_model: str | None,
    request_id: str | None,
    output_chars: int,
    cost_usd: Decimal | None = None,
) -> None:
    # State flips synchronously so callers may run this off the critical path
    # (spawn_protected) without racing finalize_stream into a spurious
    # "interrupted" row; only the persistence below is the slow tail.
    tracker.finished = True
    usage_missing = not usage.total_tokens
    if usage_missing:
        # Never leave the ledger empty (终稿 6.2): flag it and estimate.
        usage = TokenUsage(
            input_tokens=usage.input_tokens or None,
            output_tokens=usage.output_tokens or estimate_tokens(output_chars),
            total_tokens=None,
            raw=usage.raw,
        )
    await _emit(
        tracker,
        route=tracker.current_route,
        success=True,
        error_type=None,
        actual_model=actual_model,
        usage=usage,
        usage_missing=usage_missing,
        request_id=request_id,
        cost_usd=cost_usd,
    )


async def finalize_stream(tracker: UsageTracker, *, emitted_chars: int) -> None:
    """Last line of defence for client disconnects mid-stream (终稿 6.2 纪律 2)."""
    if tracker.finished:
        return
    estimated = TokenUsage(output_tokens=estimate_tokens(emitted_chars))
    await _emit(
        tracker,
        route=tracker.current_route,
        success=False,
        error_type="stream_interrupted",
        actual_model=None,
        usage=estimated,
        usage_missing=True,
        request_id=None,
    )
    tracker.finished = True


async def _emit(
    tracker: UsageTracker,
    *,
    route: ModelRoute,
    success: bool,
    error_type: str | None,
    actual_model: str | None,
    usage: TokenUsage | None,
    usage_missing: bool,
    request_id: str | None,
    cost_usd: Decimal | None = None,
) -> None:
    record: dict[str, Any] = {
        "use_case": tracker.use_case.value,
        "platform": route.platform,
        "adapter": route.adapter,
        "route_model": route.model,
        "actual_model": actual_model,
        "input_tokens": usage.input_tokens if usage else None,
        "output_tokens": usage.output_tokens if usage else None,
        "total_tokens": usage.total_tokens if usage else None,
        "raw_usage": usage.raw if usage else None,
        "cost_usd": cost_usd,
        "latency_ms": tracker.latency_ms,
        "request_id": request_id,
        "trace_id": tracker.trace_id,
        "fallback_attempt": tracker.failed_attempts,
        "success": success,
        "error_type": error_type,
        "usage_missing": usage_missing,
    }
    logger.info("ai_usage %s", json.dumps(record, ensure_ascii=False, default=str))
    emit_experience(
        tracker,
        route=route,
        success=success,
        error_type=error_type,
        route_index=tracker.failed_attempts,
    )
    await _persist(
        record, user_id=tracker.user_id, conversation_id=tracker.conversation_id
    )


async def _persist(
    record: dict[str, Any], *, user_id: str | None, conversation_id: str | None
) -> None:
    try:
        row = AiUsageLog(
            **record,
            user_id=uuid.UUID(user_id) if user_id else None,
            conversation_id=uuid.UUID(conversation_id) if conversation_id else None,
        )
        # Hard cap: generate()-style callers await this inline, so a dead
        # connection must cost seconds, not a TCP timeout (6-30 事故: 53s 阻塞).
        # 15s, NOT lower: per-task engine.dispose() means a task's first ledger
        # write pays the full cold path (TCP+TLS+auth + dialect init, ~8-10
        # round trips — several seconds over a high-RTT link); 5s killed every
        # cold write (7-2-2 事故).
        async with asyncio.timeout(15):
            async with AsyncSessionLocal() as session:
                session.add(row)
                await session.commit()
    except Exception:  # noqa: BLE001 — the ledger must never break the AI call
        logger.exception("failed to persist ai_usage_log row (trace_id=%s)", record["trace_id"])
