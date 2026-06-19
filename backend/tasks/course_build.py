"""阶段二 Celery task: build a course in the background.

Celery 纪律 (仿 video_ingest): asyncio.run wraps the async body, args are
JSON-safe (course_id as str). The orchestration fans chapters out under an
asyncio.Semaphore (caps Apify/B站 burst) and isolates each chapter — one
failure marks that chapter failed and the course keeps going. Progress truth is
the DB; the SSE endpoint reads it (no Redis pub/sub).

Client reuse: ONE Apify client is built per build and shared across every
chapter's search (search_videos(..., client=...)), closed in finally — never
one client per chapter.

Idempotent: a rerun skips ready chapters; finalize sets course ready if any
chapter succeeded, else failed.
"""

import asyncio
import logging
import uuid

from ai import init_ai_runtime, shutdown_ai_runtime
from ai.coursegen import research_chapter
from ai.search import (
    SearchPlatform,
    aclose_client,
    aclose_search_clients,
    build_client,
    platform_uses_apify,
)
from core.database import AsyncSessionLocal, engine
from services import course_build_service, course_service
from tasks.celery_app import celery_app

logger = logging.getLogger("lemma.tasks.course_build")

# Parallel chapters per build. Small on purpose: caps simultaneous Apify runs so
# B站 risk control / rate limits aren't tripped by a wide fan-out.
_CONCURRENCY = 4


async def run_build(course_id: uuid.UUID, *, research=research_chapter) -> None:
    """Async build body — the smoke awaits this directly (bypassing the worker).

    `research` is the single swap seam: a stub for protocol tests, the real
    coursegen.research_chapter in production. Its signature is fixed
    (chapter_plan, profile, *, course_id, client, on_progress) so this code never
    changes between stub and real.

    The AI runtime is initialised PER TASK (its own asyncio.run loop) and torn
    down in finally — the same discipline ai/model_factory documents for Celery
    (the shared httpx client can't outlive the per-task event loop) and that the
    FastAPI lifespan / smoke scripts follow. Without this, ai_client.generate
    (query expansion / video selection) raises "AI runtime not initialised" and
    every chapter fails at the search/select step.
    """
    init_ai_runtime()
    # Build the (paid, token-gated) Apify client ONCE per build and reuse it
    # across chapters — but only when a route actually uses Apify. Under the
    # default self-built-only table this stays None (no APIFY token needed); the
    # self-built providers (ytdlp/bili) manage their own per-loop clients.
    client = (
        build_client()
        if any(platform_uses_apify(platform) for platform in SearchPlatform)
        else None
    )
    try:
        async with AsyncSessionLocal() as db:
            context = await course_build_service.load_build_context(
                db, course_id=course_id
            )
        if context is None:
            return
        profile, pending = context
        semaphore = asyncio.Semaphore(_CONCURRENCY)

        async def _work(chapter_id: uuid.UUID, plan) -> None:
            async with semaphore:
                async with AsyncSessionLocal() as db:
                    await course_build_service.mark_chapter_researching(
                        db, chapter_id=chapter_id
                    )

                async def _report_progress(pct: int) -> None:
                    # In-flight beat (搜索25/排序50/选片75) -> DB. Best-effort:
                    # research()'s own guard swallows any failure raised here.
                    async with AsyncSessionLocal() as db:
                        await course_build_service.mark_chapter_progress(
                            db, chapter_id=chapter_id, progress=pct
                        )

                try:
                    result = await research(
                        plan,
                        profile,
                        course_id=course_id,
                        client=client,
                        on_progress=_report_progress,
                    )
                except Exception as exc:  # noqa: BLE001 — isolate this chapter
                    logger.warning("chapter %s research failed: %s", chapter_id, exc)
                    async with AsyncSessionLocal() as db:
                        await course_build_service.mark_chapter_failed(
                            db, chapter_id=chapter_id
                        )
                    return
                async with AsyncSessionLocal() as db:
                    await course_build_service.persist_chapter_result(
                        db, chapter_id=chapter_id, result=result
                    )

        await asyncio.gather(*(_work(cid, plan) for cid, plan in pending))

        async with AsyncSessionLocal() as db:
            status = await course_build_service.finalize_course(
                db, course_id=course_id
            )
            # 就近预热 (拍板): once the course is ready, fetch the FIRST chapter's
            # video right away; later chapters warm on access (see
            # video_asset_service prefetch). Best-effort — never fail the build.
            first_chapter_id = (
                await course_service.get_first_playable_chapter_id(
                    db, course_id=course_id
                )
                if status == "ready"
                else None
            )
        if first_chapter_id is not None:
            from tasks.video_download import download_chapter_video

            download_chapter_video.delay(str(first_chapter_id))
    finally:
        if client is not None:
            await aclose_client(client)
        # Close this loop's self-built search client(s) (per-task discipline).
        await aclose_search_clients()
        await shutdown_ai_runtime()
        # Each Celery task runs in its OWN asyncio.run() loop, but the
        # module-level engine pools connections bound to whatever loop first
        # opened them. Dispose here — inside this task's loop — so the next task
        # in the same worker process starts with a clean pool instead of
        # inheriting connections bound to a now-closed loop ("attached to a
        # different loop" / "Event loop is closed"). Worker-only: the API
        # process keeps its own long-lived engine, untouched.
        await engine.dispose()


@celery_app.task(
    name="course.build", bind=True, max_retries=2, default_retry_delay=30
)
def build_course(self, course_id: str) -> None:  # noqa: ANN001 — celery bind
    """Sync Celery entrypoint. The async body is idempotent, so a retry of a
    partially-built course safely resumes (ready chapters are skipped)."""
    try:
        asyncio.run(run_build(uuid.UUID(course_id)))
    except Exception as exc:  # noqa: BLE001 — let celery retry transient failures
        raise self.retry(exc=exc)
