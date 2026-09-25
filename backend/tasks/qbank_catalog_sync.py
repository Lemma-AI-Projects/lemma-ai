"""Celery tasks: XKW basic-data cache.

- qbank.catalog_fetch(kind, key): one on-demand fetch (enqueued when an admin
  catalog read misses the cache).
- qbank.catalog_sync: Beat, monthly — refreshes the course list and every
  question-type list already cached. Knowledge trees are only refreshed on
  demand (they are large, and only the courses someone uses matter).

Per-task discipline: asyncio.run, provider built + closed per task, engine
disposed at the end.
"""

import asyncio
import logging
import uuid

from core.database import AsyncSessionLocal, engine
from qbank.xkw.errors import XkwError
from qbank.xkw.provider import XkwProvider, build_provider
from qbank.xkw.types import CallContext
from services import qbank_catalog_service as catalog
from tasks.celery_app import celery_app

logger = logging.getLogger("lemma.tasks.qbank_catalog")


async def _fetch_one(provider: XkwProvider, kind: str, key: str, ctx: CallContext) -> None:
    if kind == catalog.KIND_COURSES:
        items = await provider.list_courses(ctx=ctx)
    elif kind == catalog.KIND_QUESTION_TYPES:
        items = await provider.question_types(int(key), ctx=ctx)
    elif kind == catalog.KIND_KNOWLEDGE_TREE:
        items = await provider.knowledge_tree(int(key), ctx=ctx)
    else:
        raise ValueError(f"unknown catalog kind {kind!r}")
    async with AsyncSessionLocal() as db:
        await catalog.put(db, kind=kind, key=key, items=items)


async def run_fetch(kind: str, key: str) -> None:
    provider = build_provider()
    ctx = CallContext(use_case="catalog_fetch", trace_id=uuid.uuid4().hex)
    try:
        await _fetch_one(provider, kind, key, ctx)
    finally:
        await provider.aclose()
        await engine.dispose()


async def run_sync() -> int:
    provider = build_provider()
    ctx = CallContext(use_case="catalog_sync", trace_id=uuid.uuid4().hex)
    refreshed = 0
    try:
        async with AsyncSessionLocal() as db:
            type_keys = await catalog.cached_keys(db, kind=catalog.KIND_QUESTION_TYPES)
        for kind, key in [(catalog.KIND_COURSES, catalog.COURSES_KEY)] + [
            (catalog.KIND_QUESTION_TYPES, key) for key in type_keys
        ]:
            try:
                await _fetch_one(provider, kind, key, ctx)
                refreshed += 1
            except XkwError as exc:
                logger.warning("catalog sync %s/%s failed: %s", kind, key, exc.code)
        return refreshed
    finally:
        await provider.aclose()
        await engine.dispose()


@celery_app.task(name="qbank.catalog_fetch", bind=True, max_retries=2, default_retry_delay=30)
def fetch_catalog(self, kind: str, key: str) -> None:  # noqa: ANN001 — celery bind
    try:
        asyncio.run(run_fetch(kind, key))
    except XkwError as exc:
        if exc.retryable:
            raise self.retry(exc=exc) from exc
        logger.error("catalog fetch %s/%s refused: %s", kind, key, exc.code)
    except Exception as exc:  # noqa: BLE001 — infra blip
        raise self.retry(exc=exc) from exc


@celery_app.task(name="qbank.catalog_sync")
def sync_catalog() -> int:
    return asyncio.run(run_sync())
