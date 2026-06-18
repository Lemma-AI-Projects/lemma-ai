"""Celery Beat task: sweep expired chapter video assets (滑动过期清理).

Deletes the Storage objects for assets untouched past the sliding TTL (last
access -> downloaded -> created, whichever exists), then removes the rows so a
later access lazily re-downloads. Per-task discipline: own boto3 client, dispose
the engine at the end. Storage delete is best-effort (a missing object never
blocks the row delete); a failed Storage delete just leaves the object for the
next sweep because the row is removed only after.
"""

import asyncio
import logging
from datetime import UTC, datetime, timedelta

from core import storage
from core.config import settings
from core.database import AsyncSessionLocal, engine
from services import video_asset_service
from tasks.celery_app import celery_app

logger = logging.getLogger("lemma.tasks.video_cleanup")


async def run_cleanup() -> int:
    """Delete expired assets; return how many were removed."""
    cutoff = datetime.now(UTC) - timedelta(days=settings.video_asset_ttl_days)
    try:
        async with AsyncSessionLocal() as db:
            expired = await video_asset_service.list_expired_assets(db, cutoff=cutoff)
        if not expired:
            return 0
        paths = [asset.storage_path for asset in expired if asset.storage_path]
        if paths:
            client = storage.build_s3_client()
            storage.delete_objects(client, keys=paths)
        async with AsyncSessionLocal() as db:
            await video_asset_service.delete_assets(
                db, ids=[asset.id for asset in expired]
            )
        logger.info("cleaned %d expired chapter video assets", len(expired))
        return len(expired)
    finally:
        await engine.dispose()


@celery_app.task(name="video.cleanup_expired")
def cleanup_expired_video_assets() -> int:
    return asyncio.run(run_cleanup())
