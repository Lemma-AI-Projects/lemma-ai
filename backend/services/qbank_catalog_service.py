"""XKW basic-data cache (courses / question types / knowledge trees).

Reads never call XKW: a miss enqueues a background fetch (rules 第九章) and
reports `syncing`. The Beat sync refreshes courses and cached type lists every
30 days; knowledge trees are fetched on first demand.
"""

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from models.xkw_catalog_cache import XkwCatalogCache

KIND_COURSES = "courses"
KIND_QUESTION_TYPES = "question_types"
KIND_KNOWLEDGE_TREE = "knowledge_tree"
KINDS = frozenset({KIND_COURSES, KIND_QUESTION_TYPES, KIND_KNOWLEDGE_TREE})
COURSES_KEY = "all"


@dataclass
class CatalogEntry:
    items: list[dict[str, Any]]
    fetched_at: datetime


async def get(db: AsyncSession, *, kind: str, key: str) -> CatalogEntry | None:
    row = await db.get(XkwCatalogCache, (kind, key))
    if row is None:
        return None
    payload = row.payload_json if isinstance(row.payload_json, list) else []
    return CatalogEntry(items=payload, fetched_at=row.fetched_at)


async def put(db: AsyncSession, *, kind: str, key: str, items: list[dict[str, Any]]) -> None:
    now = datetime.now(UTC)
    statement = insert(XkwCatalogCache).values(kind=kind, key=key, payload_json=items, fetched_at=now)
    statement = statement.on_conflict_do_update(
        index_elements=[XkwCatalogCache.kind, XkwCatalogCache.key],
        set_={"payload_json": statement.excluded.payload_json, "fetched_at": now},
    )
    await db.execute(statement)
    await db.commit()


async def cached_keys(db: AsyncSession, *, kind: str) -> list[str]:
    rows = await db.execute(select(XkwCatalogCache.key).where(XkwCatalogCache.kind == kind))
    return list(rows.scalars())


async def objective_by_type_id(db: AsyncSession, *, course_id: int | None) -> dict[str, bool]:
    """type_id -> objective from the cached type dictionary (empty if not cached)."""
    if course_id is None:
        return {}
    entry = await get(db, kind=KIND_QUESTION_TYPES, key=str(course_id))
    if entry is None:
        return {}
    return {
        str(item["id"]): bool(item["objective"])
        for item in entry.items
        if item.get("id") is not None and item.get("objective") is not None
    }


def enqueue_fetch(kind: str, key: str) -> None:
    # Lazy import: tasks import services.
    from tasks.qbank_catalog_sync import fetch_catalog

    fetch_catalog.delay(kind, key)
