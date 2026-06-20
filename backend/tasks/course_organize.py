"""搜索前置 Celery task: organize = 等广搜终态 → compose(选片+组织) → 落库 → 接交付链.

握手协议 C2: 单一入队点（submit_answers 入队一次），闸门在此——读 search_status：
- searching: 还没搜完 → self.retry(countdown) 稍后重判（释放 worker，不忙等）；
- failed/空池: 课程标 failed；
- searched: load 候选池 → compose（零信任校验在 compose 内）→ persist → 预热第一章。

Celery 纪律: asyncio.run 包裹 async body；AI runtime 仅在真正 compose 时初始化；DB engine
finally dispose。compose 失败(AIError)按 failed 处理，不无限重试；意外基础设施错误才走重试。
"""

import asyncio
import logging
import uuid

from ai import init_ai_runtime, shutdown_ai_runtime
from ai.coursegen import stream_compose_course
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
            async for event in stream_compose_course(topic, answers, candidates):
                if event.kind == "reasoning":
                    if event.reasoning_text:
                        await publisher.reasoning(event.reasoning_text)
                elif event.kind == "result":
                    result = event.result
                    break
                elif event.kind == "error":
                    logger.warning(
                        "compose failed for course %s: %s",
                        course_id,
                        event.error_message,
                    )
                    break

            if result is None:
                async with AsyncSessionLocal() as db:
                    await course_build_service.mark_failed(db, course_id=course_id)
                await publisher.error(_COMPOSE_FAILED, "课程编排未产出有效内容")
                return _DONE

            async with AsyncSessionLocal() as db:
                final_status = await course_build_service.persist_composed_course(
                    db, course_id=course_id, result=result
                )
                # 就近预热 (拍板): once ready, fetch the FIRST chapter's video now;
                # later chapters warm on access (video_asset_service prefetch).
                first_chapter_id = (
                    await course_service.get_first_playable_chapter_id(
                        db, course_id=course_id
                    )
                    if final_status == "ready"
                    else None
                )
            if first_chapter_id is not None:
                from tasks.video_download import download_chapter_video

                download_chapter_video.delay(str(first_chapter_id))
            if final_status == "ready":
                await publisher.done()
            else:
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


@celery_app.task(
    name="course.organize", bind=True, max_retries=12, default_retry_delay=5
)
def organize_course(self, course_id: str) -> None:  # noqa: ANN001 — celery bind
    """Sync Celery entrypoint. Idempotent (persist clean-slates first). Retries
    while the broad search is still running (gate), or on unexpected infra error."""
    try:
        outcome = asyncio.run(run_organize(uuid.UUID(course_id)))
    except Exception as exc:  # noqa: BLE001 — unexpected infra error: let celery retry
        raise self.retry(exc=exc)
    if outcome == _RETRY:
        # Broad search not terminal yet — re-check shortly (frees the worker
        # instead of busy-waiting). max_retries * countdown bounds the wait.
        raise self.retry(countdown=5)
