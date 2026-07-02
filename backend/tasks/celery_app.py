"""Celery application (rules 第九章: anything >2s runs here, not in the API).

Worker startup (backend/ directory) — concurrency defaults to 4 via
`worker_concurrency` below (no --concurrency flag needed):
    uv run celery -A tasks.celery_app worker --loglevel=info

Beat (periodic video-asset cleanup) — run alongside the worker:
    uv run celery -A tasks.celery_app beat --loglevel=info
(or embed in a single worker with `--beat`, fine for one worker).
"""

from celery import Celery
from celery.schedules import crontab

from core.config import settings

celery_app = Celery(
    "lemma",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "tasks.video_ingest",
        "tasks.course_search",
        "tasks.course_organize",
        "tasks.video_download",
        "tasks.chapter_gemini_ingest",
        "tasks.course_materialize",
        "tasks.video_cleanup",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    # A lost worker must not silently drop an ingest job.
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # 4 slots, not the CPU-count default (8): tasks are I/O-bound (downloads /
    # LLM waits) so throughput is unchanged for a single user, while the DB
    # connection demand against the Supabase pooler quota is halved (7-2 事故).
    worker_concurrency=4,
    result_expires=60 * 60 * 24,
    # Sliding-expiry cleanup of re-hosted chapter videos (Supabase Storage),
    # daily off-peak. The task itself computes the cutoff from VIDEO_ASSET_TTL_DAYS.
    beat_schedule={
        "cleanup-expired-video-assets": {
            "task": "video.cleanup_expired",
            "schedule": crontab(hour=3, minute=0),
        },
    },
)
