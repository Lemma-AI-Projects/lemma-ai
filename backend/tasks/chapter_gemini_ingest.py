"""Celery task: re-host a chapter's video INTO the Gemini Files API (shared).

Both the AI 伴学 video tool and the chapter OVERVIEW need the chapter's video as
a Gemini file reference (file_uri) to "see" it. The video body already lives in
Supabase Storage (chapter_video_assets, re-hosted by tasks/video_download.py);
this task pulls that body down and uploads it to the Files API, caching the
result in chapter_gemini_files (~48h lifetime). Companion + overview share that
one cache, so the second consumer reuses the upload — zero re-transfer (决策③).

Celery 纪律 (仿 video_download): asyncio.run wraps the async body; args JSON-safe;
the boto3 S3 client and the Gemini upload client are built per task (the latter
via provider_files.upload_video(fresh_client=True)); the module engine is disposed
at the end. Atomic claim stops two workers uploading the same chapter.

Flow: load the chapter's READY stored video -> atomically claim the cache row ->
download the body to a temp mp4 -> Files API upload -> mark ready. Any failure
marks the cache row failed and re-raises so Celery retries; the prep poll
(companion tool / overview) then reports preparing/failed accordingly.
"""

import asyncio
import logging
import tempfile
import uuid
from pathlib import Path

from ai.media import provider_files
from core import storage
from core.database import AsyncSessionLocal, engine
from services import gemini_file_service, video_asset_service
from tasks.celery_app import celery_app

logger = logging.getLogger("lemma.tasks.chapter_gemini_ingest")

_DEFAULT_MIME = "video/mp4"


async def run_ingest(chapter_id: uuid.UUID) -> None:
    """Async body — the smoke can await this directly (bypassing the worker)."""
    try:
        async with AsyncSessionLocal() as db:
            stored = await video_asset_service.get_ready_stored_video(
                db, chapter_id=chapter_id
            )
        if stored is None:
            # The chapter video isn't re-hosted yet (still downloading / failed):
            # nothing to upload. Mark failed so the prep poll stops waiting;
            # a later attempt (once the video is ready) re-enqueues a fresh one.
            logger.info("chapter %s has no ready stored video; skip", chapter_id)
            async with AsyncSessionLocal() as db:
                await gemini_file_service.mark_failed(
                    db, chapter_id=chapter_id, error_type="asset_not_ready"
                )
            return

        async with AsyncSessionLocal() as db:
            claimed = await gemini_file_service.claim_for_ingest(
                db, chapter_id=chapter_id, candidate_id=stored.candidate_id
            )
        if not claimed:
            logger.info(
                "chapter %s gemini file already uploading/fresh; skip", chapter_id
            )
            return

        try:
            with tempfile.TemporaryDirectory(prefix="lemma_chapter_gemini_") as tmp_dir:
                local_path = str(Path(tmp_dir) / f"{chapter_id}.mp4")
                s3_client = storage.build_s3_client()
                storage.download_file(
                    s3_client, key=stored.storage_path, local_path=local_path
                )
                # fresh_client=True: per-task Gemini client, closed inside (终稿 9.3).
                video = await provider_files.upload_video(
                    local_path,
                    mime_type=stored.mime_type or _DEFAULT_MIME,
                    fresh_client=True,
                )
        except Exception as exc:
            logger.warning("chapter %s gemini ingest failed: %s", chapter_id, exc)
            async with AsyncSessionLocal() as db:
                await gemini_file_service.mark_failed(
                    db, chapter_id=chapter_id, error_type=type(exc).__name__
                )
            raise

        async with AsyncSessionLocal() as db:
            await gemini_file_service.mark_ready(
                db,
                chapter_id=chapter_id,
                candidate_id=stored.candidate_id,
                video=video,
            )
    finally:
        # Per-task loop owns the pool; dispose so the next task starts clean.
        await engine.dispose()


@celery_app.task(
    name="chapter.gemini_ingest", bind=True, max_retries=2, default_retry_delay=30
)
def ingest_chapter_gemini_file(self, chapter_id: str) -> None:  # noqa: ANN001 — celery bind
    """Sync Celery entrypoint. Idempotent: a duplicate delivery or retry of an
    already-uploading/fresh chapter is a no-op (the claim guards it)."""
    try:
        asyncio.run(run_ingest(uuid.UUID(chapter_id)))
    except Exception as exc:  # noqa: BLE001 — let celery retry transient failures
        raise self.retry(exc=exc)
