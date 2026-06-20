"""阶段三 Celery task: re-host a chapter's chosen video in Supabase Storage.

Celery 纪律 (仿 course_build / video_ingest): asyncio.run wraps the async body,
args are JSON-safe (chapter_id as str), the boto3 S3 client is built per task,
and the module-level engine is disposed at the end so the next task in the same
worker process starts with a clean connection pool.

Flow: resolve the chapter's chosen candidate -> atomically claim the asset row
(skip if another worker is already downloading, or it's already ready) -> route
through the platform download backend to a temp mp4 -> boto3 multipart upload to
the PRIVATE bucket (never the SDK's single-PUT .upload()) -> mark ready. Any
failure marks the asset failed and re-raises so Celery retries; a retry re-claims
(failed -> downloading) and tries again.
"""

import asyncio
import logging
import tempfile
import uuid
from pathlib import Path

from core import storage
from core.config import settings
from core.database import AsyncSessionLocal, engine
from services import video_asset_service
from tasks.celery_app import celery_app
from tasks.video_source_download import download_video_to_mp4

logger = logging.getLogger("lemma.tasks.video_download")

_CONTENT_TYPE = "video/mp4"


def _storage_key(chapter_id: uuid.UUID) -> str:
    # One stable key per chapter: a re-pick re-downloads and overwrites in place,
    # so no orphaned objects accumulate. Always .mp4 (download backends remux).
    return f"chapters/{chapter_id}.mp4"


async def run_download(chapter_id: uuid.UUID) -> None:
    """Async body — the smoke can await this directly (bypassing the worker)."""
    try:
        async with AsyncSessionLocal() as db:
            target = await video_asset_service.load_download_target(
                db, chapter_id=chapter_id
            )
        if target is None:
            logger.info("chapter %s has no chosen video; skip", chapter_id)
            return

        async with AsyncSessionLocal() as db:
            claimed = await video_asset_service.claim_for_download(
                db, chapter_id=chapter_id, candidate_id=target.candidate_id
            )
        if not claimed:
            logger.info("chapter %s already downloading/ready; skip", chapter_id)
            return

        key = _storage_key(chapter_id)
        try:
            with tempfile.TemporaryDirectory(prefix="lemma_video_") as tmp_dir:
                download = download_video_to_mp4(
                    target.url,
                    Path(tmp_dir),
                    platform=target.platform,
                    chapter_id=chapter_id,
                )
                video_path = download.path
                size_bytes = video_path.stat().st_size
                client = storage.build_s3_client()
                storage.upload_file(
                    client,
                    local_path=str(video_path),
                    key=key,
                    content_type=_CONTENT_TYPE,
                )
        except Exception as exc:
            logger.warning(
                "chapter %s video download/upload failed: %s", chapter_id, exc
            )
            async with AsyncSessionLocal() as db:
                await video_asset_service.mark_failed(
                    db, chapter_id=chapter_id, error_type=type(exc).__name__
                )
            raise

        async with AsyncSessionLocal() as db:
            await video_asset_service.mark_ready(
                db,
                chapter_id=chapter_id,
                candidate_id=target.candidate_id,
                storage_bucket=settings.supabase_storage_bucket,
                storage_path=key,
                size_bytes=size_bytes,
                mime_type=_CONTENT_TYPE,
                duration_s=target.duration_s,
                download_backend=download.backend,
            )
    finally:
        # Per-task loop owns the pool; dispose so the next task starts clean.
        await engine.dispose()


@celery_app.task(
    name="video.download_chapter", bind=True, max_retries=2, default_retry_delay=30
)
def download_chapter_video(self, chapter_id: str) -> None:  # noqa: ANN001 — celery bind
    """Sync Celery entrypoint. Idempotent: a duplicate delivery or retry of an
    already-downloading/ready chapter is a no-op (the claim guards it)."""
    try:
        asyncio.run(run_download(uuid.UUID(chapter_id)))
    except Exception as exc:  # noqa: BLE001 — let celery retry transient failures
        raise self.retry(exc=exc)
