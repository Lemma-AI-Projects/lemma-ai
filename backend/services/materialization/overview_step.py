"""OverviewStep: the first chapter content step (决策⑧).

Wraps the shared overview core behind the ChapterContentStep protocol. Idempotent:
re-runs short-circuit on an already-ready overview (read_ready hit), and the claim
machine stops concurrent duplicate generation. DB is the source of truth for the
terminal status — `ensure` reports ready/failed from it, never raising.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from ai import VideoInput
from core.database import AsyncSessionLocal
from services import course_overview_service
from services.materialization import overview_core
from services.materialization.types import StepContext, StepResult, StepStatus


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
        # Idempotent fast path: an already-ready overview (e.g. a re-enqueued
        # chord re-run) is reused without another model call.
        async with AsyncSessionLocal() as db:
            if await course_overview_service.read_ready(
                db, chapter_id=ctx.chapter_id, candidate_id=ctx.candidate_id
            ):
                return StepResult(status="ready")
            won = await course_overview_service.claim_for_generate(
                db, chapter_id=ctx.chapter_id, candidate_id=ctx.candidate_id
            )
        if won:
            # Drain the shared core (no SSE consumer here): it streams the model,
            # persists mark_ready on done / mark_failed on error.
            async for _chunk in overview_core.generate_overview_chunks(
                course_id=ctx.course_id,
                user_id=ctx.user_id,
                chapter_id=ctx.chapter_id,
                candidate_id=ctx.candidate_id,
                video=video,
            ):
                pass
        # DB is truth (we generated, or a concurrent run did).
        async with AsyncSessionLocal() as db:
            markdown = await course_overview_service.read_ready(
                db, chapter_id=ctx.chapter_id, candidate_id=ctx.candidate_id
            )
        return StepResult(status="ready" if markdown else "failed")
