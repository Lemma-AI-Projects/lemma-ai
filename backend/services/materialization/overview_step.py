"""OverviewStep: the first chapter content step (决策⑧).

Wraps the shared overview core behind the ChapterContentStep protocol. Idempotent:
re-runs short-circuit on an already-ready overview (read_ready hit), and the claim
machine stops concurrent duplicate generation. DB is the source of truth for the
terminal status — `ensure` reports ready/failed from it. Infra exceptions (DB
down mid-persist) DO propagate: the chapter task maps them to "left non-terminal
for the retry pass", which is exactly right for them.

Resilience added after the 7-3 incident (one chapter bricked a whole course):
- TRANSIENT generation failures (gateway ~60s stream cutoff -> ai_timeout, rate
  limits) are retried in-step a few times instead of burning a finalize retry.
- A LOST claim no longer reads as instant failure: we poll the active
  generator's outcome, and only take over once its claim goes stale.
"""

import asyncio
import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from ai import VideoInput
from ai.errors import is_retryable_error_code
from core.database import AsyncSessionLocal
from services import course_overview_service
from services.materialization import overview_core
from services.materialization.types import StepContext, StepResult, StepStatus

logger = logging.getLogger("lemma.services.materialization.overview")

# In-step bounded retry for transient failures only; verdicts (e.g. the 1M-token
# 400) fail on the first attempt.
_MAX_GENERATE_ATTEMPTS = 3
_RETRY_BACKOFF_S = (5.0, 15.0)

# Lost-claim wait: poll the active generator's row until it lands ready/failed.
# 22 ticks × 10s ≈ 3.7 min — just past course_overview_service's 3-minute
# claim-staleness window, so a DEAD generator's claim expires within our wait
# and the take-over re-claim below succeeds.
_PEER_POLL_S = 10.0
_PEER_MAX_TICKS = 22


class OverviewStep:
    name = "overview"

    async def status(
        self, db: AsyncSession, *, chapter_id: uuid.UUID, candidate_id: uuid.UUID
    ) -> StepStatus:
        snapshot = await course_overview_service.read_snapshot(
            db, chapter_id=chapter_id, candidate_id=candidate_id
        )
        if snapshot.status == "ready":
            return "ready"
        if snapshot.status == "failed":
            return "failed"
        return "pending"

    async def ensure(self, ctx: StepContext, video: VideoInput) -> StepResult:
        last_error: str | None = None
        for attempt in range(_MAX_GENERATE_ATTEMPTS):
            if attempt:
                backoff = _RETRY_BACKOFF_S[min(attempt - 1, len(_RETRY_BACKOFF_S) - 1)]
                await asyncio.sleep(backoff)
            result = await self._ensure_once(ctx, video)
            if result.status == "ready":
                return result
            last_error = result.error_type
            if not is_retryable_error_code(last_error):
                return result
            logger.warning(
                "chapter %s overview attempt %d failed with transient %s",
                ctx.chapter_id,
                attempt + 1,
                last_error,
            )
        return StepResult(status="failed", error_type=last_error)

    async def _ensure_once(self, ctx: StepContext, video: VideoInput) -> StepResult:
        """One claim->generate->read pass. DB is truth for the outcome."""
        async with AsyncSessionLocal() as db:
            # Idempotent fast path: an already-ready overview (e.g. a re-enqueued
            # chord re-run) is reused without another model call.
            if await course_overview_service.read_ready(
                db, chapter_id=ctx.chapter_id, candidate_id=ctx.candidate_id
            ):
                return StepResult(status="ready")
            won = await course_overview_service.claim_for_generate(
                db, chapter_id=ctx.chapter_id, candidate_id=ctx.candidate_id
            )
        if won:
            await self._generate(ctx, video)
        else:
            # Another generator (SSE tab / crashed previous pass) holds the
            # claim: wait for its outcome instead of reporting a false failure.
            peer = await self._await_peer(ctx)
            if peer is not None:
                return peer
            # Claim went stale (generator died mid-run): take over.
            async with AsyncSessionLocal() as db:
                won = await course_overview_service.claim_for_generate(
                    db, chapter_id=ctx.chapter_id, candidate_id=ctx.candidate_id
                )
            if won:
                await self._generate(ctx, video)

        async with AsyncSessionLocal() as db:
            markdown = await course_overview_service.read_ready(
                db, chapter_id=ctx.chapter_id, candidate_id=ctx.candidate_id
            )
            if markdown:
                return StepResult(status="ready")
            snapshot = await course_overview_service.read_snapshot(
                db, chapter_id=ctx.chapter_id, candidate_id=ctx.candidate_id
            )
        return StepResult(status="failed", error_type=snapshot.error_type)

    async def _generate(self, ctx: StepContext, video: VideoInput) -> None:
        # Drain the shared core (no SSE consumer here): it streams the model,
        # persists mark_ready on done / mark_failed on error.
        async for _chunk in overview_core.generate_overview_chunks(
            course_id=ctx.course_id,
            user_id=ctx.user_id,
            chapter_id=ctx.chapter_id,
            candidate_id=ctx.candidate_id,
            video=video,
            video_duration_s=ctx.video_duration_s,
        ):
            pass

    async def _await_peer(self, ctx: StepContext) -> StepResult | None:
        """Poll the active generator's outcome; None -> its claim went stale."""
        for _tick in range(_PEER_MAX_TICKS):
            await asyncio.sleep(_PEER_POLL_S)
            async with AsyncSessionLocal() as db:
                snapshot = await course_overview_service.read_snapshot(
                    db, chapter_id=ctx.chapter_id, candidate_id=ctx.candidate_id
                )
            if snapshot.status == "ready":
                return StepResult(status="ready")
            if snapshot.status == "failed":
                return StepResult(
                    status="failed", error_type=snapshot.error_type
                )
            if snapshot.status == "pending":
                # Row swept / stale-ready from a re-pick: nothing to wait on.
                return None
        return None
