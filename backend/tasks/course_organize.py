"""搜索前置 Celery task: organize = 等广搜终态 → compose(选片+组织) → 落库 → 接交付链.

握手协议 C2: 单一入队点（submit_answers 入队一次），闸门在此——读 search_status：
- searching: 还没搜完 → self.retry(countdown) 稍后重判（释放 worker，不忙等）；
- failed/空池: 课程标 failed；
- searched: load 候选池 → compose（零信任校验在 compose 内）→ persist → 预热第一章。

Celery 纪律: asyncio.run 包裹 async body；AI runtime 仅在真正 compose 时初始化；DB engine
finally dispose。compose 的终态失败(空结果/4xx 判定)按 failed 处理；瞬时失败
(ai_timeout/ai_rate_limited, 例如网关 ~60s 掐断流) 与基础设施错误共用有界 infra 重试预算。
"""

import asyncio
import logging
import uuid

from ai import init_ai_runtime, shutdown_ai_runtime
from ai.coursegen import stream_compose_course
from ai.errors import is_retryable_error_code
from core.database import AsyncSessionLocal, engine
from services import course_build_service, course_search_service, course_service
from services.course_organize_events import (
    OrganizeEventPublisher,
    build_search_payload,
)
from tasks.celery_app import celery_app

logger = logging.getLogger("lemma.tasks.course_organize")

# Outcomes of one organize attempt.
_RETRY = "retry"  # broad search not finished yet — re-check later
_DONE = "done"  # terminal (ready or failed) — nothing more to do

# Business codes published on the organize channel (frontend maps to copy).
_COMPOSE_FAILED = "course_compose_failed"
_SEARCH_FAILED = "course_search_failed"

# Two SEPARATE retry budgets (6-30 事故: 等搜索与 DB 抖动共用 12 次预算, 差点烧穿):
# - gate: broad search not terminal yet. Generous wall-clock budget (~5 min of
#   10s polls; degraded-network searches have taken 161s).
# - infra: unexpected exceptions (DB/Redis blips). Small budget — the engine's
#   connect/command timeouts make each attempt fail fast.
# Exhausting either budget lands the course in `failed` explicitly; it must
# never hang in `organizing` (Celery's MaxRetriesExceeded path did exactly that).
_GATE_MAX_ATTEMPTS = 30
_GATE_RETRY_DELAY_S = 10
_INFRA_MAX_ATTEMPTS = 5
_INFRA_RETRY_DELAY_S = 10


class _TransientComposeError(Exception):
    """Compose died on a TRANSIENT provider failure (gateway ~60s stream cutoff
    -> ai_timeout, rate limit). Raised so the task-level infra budget retries
    the whole organize instead of terminally failing the course (7-2 事故:
    one RemoteProtocolError bricked the course). Idempotent to re-run: the
    search gate is already terminal, so a retry goes straight back to compose."""


def _enqueue_materialize_chord(
    course_id: uuid.UUID, chapter_ids: list[uuid.UUID]
) -> None:
    """Fan out the initial per-chapter materialization chord (attempt 0). The
    finalize callback bounded-retries the unfinished chapters before failing.
    Lazy import: tasks import services, so a top-level import would cycle."""
    from tasks.course_materialize import enqueue_materialize_chord

    enqueue_materialize_chord(course_id, chapter_ids)


async def run_organize(course_id: uuid.UUID) -> str:
    """One organize attempt. Returns _RETRY (search still running) or _DONE.

    搜索前置 + 实时 SSE (方案二): gates on search_status, then composes over the
    cached pool while PUBLISHING live events to `course:organize:{id}` — the real
    search hits, the model's reasoning as it selects+organizes, and a terminal
    done/error. The API /organize/stream relays these to the browser. Publishing
    is best-effort (never blocks compose/persist); the course completes and lands
    in the DB regardless of whether anyone is listening (acks_late + 幂等 persist).
    """
    publisher: OrganizeEventPublisher | None = None
    try:
        async with AsyncSessionLocal() as db:
            search_status = await course_search_service.read_search_status(
                db, course_id=course_id
            )
        if search_status is None:
            return _DONE  # course gone
        if search_status == course_search_service.SEARCHING:
            # Gate: broad search not terminal yet. No publisher opened — the API
            # endpoint emits the `searching` heartbeat on its own until events flow.
            return _RETRY

        publisher = OrganizeEventPublisher(course_id)

        if search_status == course_search_service.SEARCH_FAILED:
            async with AsyncSessionLocal() as db:
                await course_build_service.mark_failed(db, course_id=course_id)
            await publisher.error("course_search_failed", "未找到可用的学习视频")
            return _DONE

        # search_status == SEARCHED -> compose (needs the AI runtime).
        init_ai_runtime()
        try:
            async with AsyncSessionLocal() as db:
                inputs = await course_build_service.load_compose_inputs(
                    db, course_id=course_id
                )
                candidates = await course_search_service.load_search_candidates(
                    db, course_id=course_id
                )
            if inputs is None:
                return _DONE  # course gone mid-flight
            topic, answers = inputs
            if not candidates:
                async with AsyncSessionLocal() as db:
                    await course_build_service.mark_failed(db, course_id=course_id)
                await publisher.error(_COMPOSE_FAILED, "课程编排未产出有效内容")
                return _DONE

            # Real search results first, then stream the compose reasoning live.
            await publisher.search(build_search_payload(candidates))
            result = None
            error_code: str | None = None
            async for event in stream_compose_course(topic, answers, candidates):
                if event.kind == "reasoning":
                    if event.reasoning_text:
                        await publisher.reasoning(event.reasoning_text)
                elif event.kind == "result":
                    result = event.result
                    break
                elif event.kind == "error":
                    error_code = event.error_code
                    logger.warning(
                        "compose failed for course %s: %s (%s)",
                        course_id,
                        event.error_message,
                        event.error_code,
                    )
                    break

            if result is None and is_retryable_error_code(error_code):
                # Transient model failure: retry via the infra budget instead
                # of terminally failing the course. No mark_failed, no error
                # frame — the course stays `organizing` and the SSE stays open.
                raise _TransientComposeError(error_code)

            if result is None:
                async with AsyncSessionLocal() as db:
                    await course_build_service.mark_failed(db, course_id=course_id)
                await publisher.error(_COMPOSE_FAILED, "课程编排未产出有效内容")
                return _DONE

            async with AsyncSessionLocal() as db:
                final_status = await course_build_service.persist_composed_course(
                    db, course_id=course_id, result=result
                )
                chapter_ids = (
                    await course_service.get_ordered_playable_chapter_ids(
                        db, course_id=course_id
                    )
                    if final_status == "materializing"
                    else []
                )
            if final_status == "materializing" and chapter_ids:
                # 物料化门禁: fan out a chord — each chapter materializes its video +
                # overview inline; the callback strictly flips ready/failed. The
                # organize SSE stays open (materializing is non-terminal) and the
                # chord tasks publish progress + the terminal done/error. NOTE: no
                # publisher.done() here — finalize owns the terminal frame.
                _enqueue_materialize_chord(course_id, chapter_ids)
            else:
                # compose produced nothing playable -> terminal failure.
                async with AsyncSessionLocal() as db:
                    await course_build_service.mark_failed(db, course_id=course_id)
                await publisher.error(_COMPOSE_FAILED, "课程编排未产出有效内容")
            return _DONE
        finally:
            await shutdown_ai_runtime()
    finally:
        if publisher is not None:
            await publisher.aclose()
        # Each task runs in its own asyncio.run loop; dispose the module engine so
        # the next task starts with a clean pool (same discipline as other tasks).
        await engine.dispose()


async def _give_up(course_id: uuid.UUID, code: str, message: str) -> None:
    """Terminal fallback when a retry budget is exhausted: land `failed` so the
    course never hangs in `organizing`, and publish the error frame. Never
    raises — this is the last line of defence, failures are only logged."""
    publisher = OrganizeEventPublisher(course_id)
    try:
        async with AsyncSessionLocal() as db:
            await course_build_service.mark_failed(db, course_id=course_id)
        await publisher.error(code, message)
    except Exception:  # noqa: BLE001 — best effort; log and move on
        logger.exception(
            "failed to mark course %s failed after budget exhaustion", course_id
        )
    finally:
        await publisher.aclose()
        await engine.dispose()


@celery_app.task(name="course.organize", bind=True, max_retries=None)
def organize_course(
    self,  # noqa: ANN001 — celery bind
    course_id: str,
    gate_attempts: int = 0,
    infra_attempts: int = 0,
) -> None:
    """Sync Celery entrypoint. Idempotent (persist clean-slates first).

    max_retries=None because Celery's single shared counter cannot tell "still
    waiting for the search" from "infra error"; the two budgets are threaded
    explicitly through kwargs and enforced here, and exhausting either one
    fails the course explicitly instead of leaving it hanging."""
    try:
        outcome = asyncio.run(run_organize(uuid.UUID(course_id)))
    except Exception as exc:  # noqa: BLE001 — unexpected infra error
        if infra_attempts + 1 >= _INFRA_MAX_ATTEMPTS:
            logger.error(
                "organize infra retries exhausted for course %s", course_id
            )
            asyncio.run(
                _give_up(
                    uuid.UUID(course_id), _COMPOSE_FAILED, "课程编排失败，请重试"
                )
            )
            raise
        raise self.retry(
            exc=exc,
            countdown=_INFRA_RETRY_DELAY_S,
            args=[course_id],
            kwargs={
                "gate_attempts": gate_attempts,
                "infra_attempts": infra_attempts + 1,
            },
        )
    if outcome == _RETRY:
        # Broad search not terminal yet — re-check shortly (frees the worker
        # instead of busy-waiting).
        if gate_attempts + 1 >= _GATE_MAX_ATTEMPTS:
            logger.error(
                "broad search never reached a terminal state for course %s",
                course_id,
            )
            asyncio.run(
                _give_up(uuid.UUID(course_id), _SEARCH_FAILED, "视频搜索超时，请重试")
            )
            return
        raise self.retry(
            countdown=_GATE_RETRY_DELAY_S,
            args=[course_id],
            kwargs={
                "gate_attempts": gate_attempts + 1,
                "infra_attempts": infra_attempts,
            },
        )
