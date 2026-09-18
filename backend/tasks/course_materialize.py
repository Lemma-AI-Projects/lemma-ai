"""物料化门禁 Celery chord: per-point materialize + strict finalize.

Fan-out (决策②, 拍板 1): `run_organize` enqueues
`chord(group(point.materialize per point) | course.materialize_finalize)`.

- `point.materialize(point_id)` INLINES the existing core bodies — never
  `.delay()`s a sub-task and polls — so no task ever waits on another and the
  chord can't deadlock the worker pool (at concurrency=1 it just runs serially):
    1. video_download.run_download   (chosen video -> Supabase Storage)
    2. each registered content step (currently none — a point is ready as soon
       as its video is playable).
  The Gemini Files upload is deliberately NOT done here: it expires in ~48h and
  the companion warms it lazily on first use (services/point_gemini_prep).
  It SWALLOWS every exception and ALWAYS returns normally so the chord callback
  fires. CONTENT failures (unusable video) land a terminal `failed`;
  INFRA blips (DB/network, 6-30 事故) leave the point non-terminal so the
  retry pass re-runs it without flashing a false failure at the user.
  Transient-failure resilience is the course-level re-enqueue (decision⑥),
  not Celery auto-retry.
- `course.materialize_finalize` reads the DB (the truth, not the chord results)
  and atomically flips the course via single conditional UPDATEs. Within the
  retry budget the gate is STRICT (all ready -> `ready` + done(), else retry);
  once the budget is exhausted it FORCES leftover non-terminal points to
  `failed` and then delivers PARTIALLY (7-3 拍板): >=1 ready point -> course
  `ready` + done() with failed points rendered in-course (self-heal on visit);
  nothing ready -> `failed` + error(). Either way the course never hangs in
  `materializing`.

Celery 纪律: asyncio.run wraps the async body; the module engine is disposed at
the end. Idempotent/re-entrant: every core body hits its claim/mark, so a
re-enqueued chord skips finished points and only retries the failed ones.
"""

import asyncio
import contextlib
import logging
import uuid

import asyncpg
from sqlalchemy.exc import SQLAlchemyError

from core.database import AsyncSessionLocal, engine
from services import course_build_service, course_service, video_asset_service
from services.course_organize_events import OrganizeEventPublisher
from services.materialization import CONTENT_STEPS, StepContext
from tasks.celery_app import celery_app
from tasks.video_download import run_download

logger = logging.getLogger("lemma.tasks.course_materialize")

_READY = "ready"
_FAILED = "failed"
# Worker-log-only marker for "left non-terminal, retry pass will re-run it".
_PENDING = "pending"
_MATERIALIZE_FAILED = "course_materialize_failed"

# Infrastructure errors are not a verdict on the point's content: the point
# stays non-terminal and the bounded retry chord re-runs it. ConnectionError /
# TimeoutError are OSError subclasses; SQLAlchemyError covers errors wrapped by
# the DBAPI layer; raw asyncpg errors surface UNwrapped from the connect phase
# (6-30: `ConnectionError` mid-handshake; 7-2: `InternalServerError` EMAXCONNSESSION).
_INFRA_ERRORS = (
    SQLAlchemyError,
    OSError,
    asyncpg.PostgresError,
    asyncpg.InterfaceError,
)

# Bounded automatic retry: a point's video can fail transiently. The strict gate
# then fails the whole course, so the finalize re-enqueues the UNFINISHED points
# a few times (ready ones are skipped via claim/mark) before giving up —
# transient failures self-heal instead of bricking the course.
_MAX_MATERIALIZE_ATTEMPTS = 3
_RETRY_BACKOFF_S = 20


async def _materialize_point_steps(
    point_id: uuid.UUID, ctx: course_service.PointMaterializeContext
) -> str:
    """Inline video download -> content steps. Returns 'ready' | 'failed'.

    Each core body is idempotent (claim/mark): a re-run hits a ready asset and
    skips. run_download marks its own asset failed and re-raises; we swallow +
    gate on the readiness read.
    """
    # 1. chosen video -> Supabase Storage.
    try:
        await run_download(point_id)
    except Exception:  # noqa: BLE001 — failure is recorded on the asset row
        logger.warning("point %s video download failed", point_id, exc_info=True)
    async with AsyncSessionLocal() as db:
        stored = await video_asset_service.get_ready_stored_video(db, point_id=point_id)
    if stored is None:
        return _FAILED

    # 2. registered content steps (none today; quiz/practice land here later).
    step_ctx = StepContext(
        course_id=ctx.course_id,
        user_id=ctx.user_id,
        point_id=point_id,
        candidate_id=stored.candidate_id,
        video_duration_s=stored.duration_s,
    )
    for step in CONTENT_STEPS:
        result = await step.ensure(step_ctx)
        if result.status != _READY:
            logger.info(
                "point %s step %s failed: %s", point_id, step.name, result.error_type
            )
            return _FAILED
    return _READY


async def run_materialize_point(point_id: uuid.UUID) -> str:
    """Async body. NEVER raises — the chord callback must always fire.

    Content failures land a terminal `failed`. Infra blips (`_INFRA_ERRORS`)
    leave the point status untouched (non-terminal `researching`) so the
    retry chord re-runs it instead of showing the user a false failure; the
    exhausted-budget finalize force-terminalizes any leftovers. Progress is
    surfaced by the /organize/stream endpoint from DB truth, so the point
    task itself publishes nothing."""
    # None -> leave the point status untouched (infra blip, not a verdict).
    status: str | None = _FAILED
    try:
        async with AsyncSessionLocal() as db:
            ctx = await course_service.load_point_materialize_context(
                db, point_id=point_id
            )
        if ctx is None or ctx.candidate_id is None:
            logger.info("point %s has no materialize context; mark failed", point_id)
            return _FAILED
        status = await _materialize_point_steps(point_id, ctx)
    except _INFRA_ERRORS:
        logger.warning(
            "point %s materialize hit an infra error; left non-terminal for"
            " the retry pass",
            point_id,
            exc_info=True,
        )
        status = None
    except Exception:  # noqa: BLE001 — swallow: the chord callback must still fire
        logger.exception("point %s materialize crashed", point_id)
        status = _FAILED
    finally:
        if status is not None:
            with contextlib.suppress(Exception):
                async with AsyncSessionLocal() as db:
                    await course_service.set_point_build_status(
                        db, point_id=point_id, build_status=status
                    )
        await engine.dispose()
    return status if status is not None else _PENDING


async def run_finalize(course_id: uuid.UUID, attempt: int) -> None:
    """Strict gate with bounded auto-retry. All points ready -> course ready +
    done(). Otherwise, while attempts remain, re-enqueue the UNFINISHED points
    (ready ones are skipped via claim/mark) with backoff, leaving the course
    `materializing` so a transient failure self-heals. Only after exhausting
    retries does the strict gate fail the course (+ error()).
    Single conditional UPDATEs keep the flip race-safe (only the winner publishes).
    """
    publisher = OrganizeEventPublisher(course_id)
    try:
        async with AsyncSessionLocal() as db:
            if await course_build_service.finalize_ready(db, course_id=course_id):
                await publisher.done()
                return

        next_attempt = attempt + 1
        if next_attempt < _MAX_MATERIALIZE_ATTEMPTS:
            async with AsyncSessionLocal() as db:
                pending = await course_service.get_unfinished_point_ids(
                    db, course_id=course_id
                )
            if pending:
                logger.warning(
                    "course %s materialize attempt %d incomplete (%d points left);"
                    " retrying",
                    course_id,
                    attempt,
                    len(pending),
                )
                enqueue_materialize_chord(
                    course_id,
                    pending,
                    attempt=next_attempt,
                    countdown=_RETRY_BACKOFF_S,
                )
                return  # course stays `materializing`; the retry chord will finalize

        # Retries exhausted: force leftover non-terminal points to `failed`
        # first (infra crashes keep them `researching` by design), so one of the
        # conditional flips below necessarily fires — the course must never hang
        # in `materializing`.
        async with AsyncSessionLocal() as db:
            forced = await course_build_service.fail_unfinished_points(
                db, course_id=course_id
            )
        if forced:
            logger.warning(
                "course %s: forced %d unfinished points to failed after"
                " exhausting materialize retries",
                course_id,
                forced,
            )
        # Partial delivery (7-3 拍板): >=1 ready point ships the course as
        # ready — failed points render as failed in-course and self-heal
        # lazily on visit. Only a course with NOTHING usable fails outright.
        async with AsyncSessionLocal() as db:
            if await course_build_service.finalize_partial(db, course_id=course_id):
                async with AsyncSessionLocal() as db:
                    _done, total, failed = (
                        await course_service.get_materialization_progress(
                            db, course_id=course_id
                        )
                    )
                logger.warning(
                    "course %s delivered partially: %d/%d points failed",
                    course_id,
                    failed,
                    total,
                )
                await publisher.done()
                return
        async with AsyncSessionLocal() as db:
            if await course_build_service.finalize_failed(db, course_id=course_id):
                await publisher.error(
                    _MATERIALIZE_FAILED, "部分学习点物料化失败，无法进入课程"
                )
                return
        # No-op now only means another finalize already flipped the course.
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


def enqueue_materialize_chord(
    course_id: uuid.UUID,
    point_ids: list[uuid.UUID],
    *,
    attempt: int = 0,
    countdown: int = 0,
) -> None:
    """Fan out per-point materialize + the strict finalize callback. `attempt`
    threads the retry counter through the callback; `countdown` delays a retry's
    header tasks (backoff). Lazy import keeps celery `chord` out of import time."""
    from celery import chord, group

    header = group(
        point_materialize.s(str(point_id)).set(countdown=countdown)
        if countdown
        else point_materialize.s(str(point_id))
        for point_id in point_ids
    )
    chord(header)(course_materialize_finalize.s(str(course_id), attempt))


@celery_app.task(name="point.materialize", bind=True)
def point_materialize(self, point_id: str) -> str:  # noqa: ANN001 — celery bind
    """Sync entrypoint. Always returns normally (swallows) so the chord fires."""
    return asyncio.run(run_materialize_point(uuid.UUID(point_id)))


@celery_app.task(
    name="course.materialize_finalize",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
)
def course_materialize_finalize(
    self,  # noqa: ANN001 — celery bind
    results: object,
    course_id: str,
    attempt: int = 0,
) -> None:
    """Chord callback. `results` (header return values) are ignored — the DB is
    the source of truth for the strict gate. `attempt` is the retry counter.

    Bounded Celery retry: this callback is the only thing that can flip the
    course terminal, so a DB blip during finalize must be retried instead of
    stranding the course in `materializing`."""
    try:
        asyncio.run(run_finalize(uuid.UUID(course_id), attempt))
    except Exception as exc:  # noqa: BLE001 — infra blip: retry the flip
        raise self.retry(exc=exc)
