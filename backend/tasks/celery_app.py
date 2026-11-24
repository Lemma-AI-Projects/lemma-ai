"""Celery application (rules 第九章: anything >2s runs here, not in the API).

Worker startup (backend/ directory) — concurrency defaults to 4 via
`worker_concurrency` below (no --concurrency flag needed):
    uv run celery -A tasks.celery_app worker --loglevel=info

Beat (periodic question-bank catalog sync) — run alongside the worker:
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
        "tasks.question_set_build",
        "tasks.qbank_catalog_sync",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    # A lost worker must not silently drop a job.
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # 4 slots, not the CPU-count default (8): tasks are I/O-bound (downloads /
    # LLM waits) so throughput is unchanged for a single user, while the DB
    # connection demand against the Supabase pooler quota is halved (7-2 事故).
    worker_concurrency=4,
    result_expires=60 * 60 * 24,
    beat_schedule={
        # XKW basic data changes rarely; refresh the cached course / type
        # dictionaries once a month (~30 days) off-peak.
        "sync-qbank-catalog": {
            "task": "qbank.catalog_sync",
            "schedule": crontab(day_of_month=1, hour=4, minute=0),
        },
    },
)
