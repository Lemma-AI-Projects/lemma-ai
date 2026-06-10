"""Celery application (rules 第九章: anything >2s runs here, not in the API).

Worker startup (backend/ directory):
    uv run celery -A tasks.celery_app worker --loglevel=info
"""

from celery import Celery

from core.config import settings

celery_app = Celery(
    "lemma",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["tasks.video_ingest"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    # A lost worker must not silently drop an ingest job.
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=60 * 60 * 24,
)
