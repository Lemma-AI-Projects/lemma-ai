"""物料化门禁 Celery chord: per-chapter materialize + strict finalize.

Fan-out (决策②, 拍板 1): `run_organize` enqueues
`chord(group(chapter.materialize per chapter) | course.materialize_finalize)`.

- `chapter.materialize(chapter_id)` INLINES the existing core bodies — never
  `.delay()`s a sub-task and polls — so no task ever waits on another and the
  chord can't deadlock the worker pool (at concurrency=1 it just runs serially):
    1. video_download.run_download   (chosen video -> Supabase Storage)
    2. chapter_gemini_ingest.run_ingest  (Storage -> Gemini Files API cache)
    3. each registered content step (OverviewStep) — drains the shared overview
       core (no SSE consumer; just persists + records ai_usage_logs).
  It SWALLOWS every exception, lands `course_chapters.status` (ready/failed), and
  ALWAYS returns normally so the chord callback fires. Transient-failure
  resilience is the course-level re-enqueue (decision⑥), not Celery auto-retry.
- `course.materialize_finalize` reads the DB (the truth, not the chord results)
  and atomically flips the course: all chapters ready -> `ready` + done(); any
  chapter failed -> `failed` + error() — both via single conditional UPDATEs.

Celery 纪律: asyncio.run wraps the async body; the AI runtime is initialised for
the overview model call and torn down after; the module engine is disposed at the
end. Idempotent/re-entrant: every core body hits its claim/mark + read_usable/
read_ready, so a re-enqueued chord skips finished chapters and only retries the
ones that are still failed.
"""

import asyncio
import contextlib
import logging
import uuid

from ai import init_ai_runtime, shutdown_ai_runtime
from core.database import AsyncSessionLocal, engine
from services import (
    course_build_service,
    course_service,
    gemini_file_service,
    video_asset_service,
)
from services.course_organize_events import OrganizeEventPublisher
from services.materialization import CONTENT_STEPS, StepContext
from tasks.celery_app import celery_app
from tasks.chapter_gemini_ingest import run_ingest
from tasks.video_download import run_download

logger = logging.getLogger("lemma.tasks.course_materialize")

_READY = "ready"
_FAILED = "failed"
_MATERIALIZE_FAILED = "course_materialize_failed"


async def _materialize_chapter_steps(
    chapter_id: uuid.UUID, ctx: course_service.ChapterMaterializeContext
) -> str:
    """Inline video -> Gemini -> content steps. Returns 'ready' | 'failed'.

    Each core body is idempotent (claim/mark): a re-run hits a ready asset / file /
    overview and skips. run_download / run_ingest mark their own asset/file failed
    and re-raise; we swallow + gate on the readiness read.
    """
    # 1. chosen video -> Supabase Storage.
    try:
        await run_download(chapter_id)
    except Exception:  # noqa: BLE001 — failure is recorded on the asset row
        logger.warning("chapter %s video download failed", chapter_id, exc_info=True)
    async with AsyncSessionLocal() as db:
        stored = await video_asset_service.get_ready_stored_video(
            db, chapter_id=chapter_id
        )
    if stored is None:
        return _FAILED

    # 2. Storage -> Gemini Files API cache.
    try:
        await run_ingest(chapter_id)
    except Exception:  # noqa: BLE001 — failure is recorded on the gemini-file row
        logger.warning("chapter %s gemini ingest failed", chapter_id, exc_info=True)
    async with AsyncSessionLocal() as db:
        video = await gemini_file_service.read_usable(
            db, chapter_id=chapter_id, candidate_id=stored.candidate_id
        )
    if video is None:
        return _FAILED

    # 3. registered content steps (overview now; quiz/assignment/unit later).
    step_ctx = StepContext(
        course_id=ctx.course_id,
        user_id=ctx.user_id,
        chapter_id=chapter_id,
        candidate_id=stored.candidate_id,
    )
    for step in CONTENT_STEPS:
        result = await step.ensure(step_ctx, video)
        if result.status != _READY:
            logger.info(
                "chapter %s step %s failed: %s",
                chapter_id,
                step.name,
                result.error_type,
            )
            return _FAILED
    return _READY


async def _publish_progress(course_id: uuid.UUID) -> None:
    """Publish a materializing {done,total,failed} nudge (best-effort)."""
    try:
        async with AsyncSessionLocal() as db:
            done, total, failed = await course_service.get_materialization_progress(
                db, course_id=course_id
            )
        publisher = OrganizeEventPublisher(course_id)
        try:
            await publisher.materializing(done, total, failed)
        finally:
            await publisher.aclose()
    except Exception:  # noqa: BLE001 — progress is best-effort, never fatal
        logger.warning("publish materializing progress failed for %s", course_id)


async def run_materialize_chapter(chapter_id: uuid.UUID) -> str:
    """Async body. NEVER raises — lands a terminal chapter status + publishes
    progress, so the chord callback always fires."""
    status = _FAILED
    course_id: uuid.UUID | None = None
    try:
        async with AsyncSessionLocal() as db:
            ctx = await course_service.load_chapter_materialize_context(
                db, chapter_id=chapter_id
            )
        if ctx is None or ctx.candidate_id is None:
            logger.info("chapter %s has no materialize context; mark failed", chapter_id)
            return _FAILED
        course_id = ctx.course_id
        init_ai_runtime()
        try:
            status = await _materialize_chapter_steps(chapter_id, ctx)
        finally:
            await shutdown_ai_runtime()
    except Exception:  # noqa: BLE001 — swallow: the chord callback must still fire
        logger.exception("chapter %s materialize crashed", chapter_id)
        status = _FAILED
    finally:
        with contextlib.suppress(Exception):
            async with AsyncSessionLocal() as db:
                await course_service.set_chapter_status(
                    db, chapter_id=chapter_id, status=status
                )
        if course_id is not None:
            await _publish_progress(course_id)
        await engine.dispose()
    return status


async def run_finalize(course_id: uuid.UUID) -> None:
    """Strict gate: all chapters ready -> course ready + done(); any failed ->
    course failed + error(). Single conditional UPDATEs make this race-safe (only
    the winner flips + publishes); a no-op means already finalized or chapters
    still non-terminal (a hard crash) — recoverable by re-enqueuing the chord."""
    publisher = OrganizeEventPublisher(course_id)
    try:
        async with AsyncSessionLocal() as db:
            if await course_build_service.finalize_ready(db, course_id=course_id):
                await publisher.done()
                return
        async with AsyncSessionLocal() as db:
            if await course_build_service.finalize_failed(db, course_id=course_id):
                await publisher.error(
                    _MATERIALIZE_FAILED, "部分章节物料化失败，无法进入课程"
                )
                return
        async with AsyncSessionLocal() as db:
            done, total, failed = await course_service.get_materialization_progress(
                db, course_id=course_id
            )
        logger.info(
            "course %s finalize no-op: %d/%d ready, %d failed",
            course_id,
            done,
            total,
            failed,
        )
    finally:
        await publisher.aclose()
        await engine.dispose()


@celery_app.task(name="chapter.materialize", bind=True)
def chapter_materialize(self, chapter_id: str) -> str:  # noqa: ANN001 — celery bind
    """Sync entrypoint. Always returns normally (swallows) so the chord fires."""
    return asyncio.run(run_materialize_chapter(uuid.UUID(chapter_id)))


@celery_app.task(name="course.materialize_finalize", bind=True)
def course_materialize_finalize(
    self,  # noqa: ANN001 — celery bind
    results: object,
    course_id: str,
) -> None:
    """Chord callback. `results` (header return values) are ignored — the DB is
    the source of truth for the strict gate."""
    asyncio.run(run_finalize(uuid.UUID(course_id)))
