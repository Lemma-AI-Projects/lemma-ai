"""搜索前置 Celery task: 诉求级广搜并缓存候选池。

与问卷并发执行（由 chat_service 的规划工具回合入队）。成功且非空 → 写
course_search_candidates 并置 search_status=searched；失败或空池 → search_status=failed
（不抛、不重试到死——让 organize 据此判 failed）。

Celery 纪律 (仿 video_download / course_organize): asyncio.run 包裹 async body，
args 为 JSON-safe；Apify client 仅在需要时每任务建一次（自建-only 默认不建）；自建搜索
client 与 DB engine 在 finally 关闭/dispose，下个任务从干净状态起。
"""

import asyncio
import logging
import uuid

from ai import init_ai_runtime, shutdown_ai_runtime
from ai.coursegen import search_topic
from ai.search import (
    SearchPlatform,
    aclose_client,
    aclose_search_clients,
    build_client,
    platform_uses_apify,
)
from core.database import AsyncSessionLocal, engine
from services import course_search_service
from tasks.celery_app import celery_app

logger = logging.getLogger("lemma.tasks.course_search")


async def run_search(course_id: uuid.UUID, topic: str) -> None:
    """Async body — the smoke can await this directly (bypassing the worker)."""
    init_ai_runtime()
    # Build the (paid, token-gated) Apify client once only if a route uses it;
    # under the default self-built-only table this stays None.
    client = (
        build_client()
        if any(platform_uses_apify(platform) for platform in SearchPlatform)
        else None
    )
    try:
        try:
            candidates = await search_topic(topic, course_id=course_id, client=client)
        except Exception:  # noqa: BLE001 — operational failure -> search failed, never crash
            logger.exception("broad search failed for course %s", course_id)
            candidates = []
        async with AsyncSessionLocal() as db:
            if candidates:
                await course_search_service.persist_search_candidates(
                    db, course_id=course_id, candidates=candidates
                )
                await course_search_service.set_search_status(
                    db, course_id=course_id, status=course_search_service.SEARCHED
                )
            else:
                await course_search_service.set_search_status(
                    db, course_id=course_id, status=course_search_service.SEARCH_FAILED
                )
    finally:
        if client is not None:
            await aclose_client(client)
        await aclose_search_clients()
        await shutdown_ai_runtime()
        # Per-task loop owns the pool; dispose so the next task starts clean.
        await engine.dispose()


@celery_app.task(name="course.search")
def search_course(course_id: str, topic: str) -> None:
    """Sync Celery entrypoint. Failure is recorded as search_status=failed inside
    run_search (organize then marks the course failed), so there is nothing to
    retry to death here."""
    asyncio.run(run_search(uuid.UUID(course_id), topic))
