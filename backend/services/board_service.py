"""Board snapshot persistence (opaque tldraw state per learn space)."""

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.board_snapshot import BoardSnapshot


async def get_snapshot(
    db: AsyncSession, *, project_id: uuid.UUID
) -> BoardSnapshot | None:
    result = await db.execute(
        select(BoardSnapshot).where(BoardSnapshot.project_id == project_id)
    )
    return result.scalar_one_or_none()


async def save_snapshot(
    db: AsyncSession,
    *,
    project_id: uuid.UUID,
    snapshot: dict[str, Any],
) -> BoardSnapshot:
    """Upsert the whole-board snapshot.

    并发策略：单用户逐写入、last-write-wins 由 updated_at 体现（单空间多为
    单端编辑，冲突面小；如需多端合并再引入版本号，MVP 不做）。
    """
    existing = await get_snapshot(db, project_id=project_id)
    if existing is None:
        existing = BoardSnapshot(project_id=project_id, snapshot=snapshot)
        db.add(existing)
    else:
        existing.snapshot = snapshot
    await db.commit()
    await db.refresh(existing)
    return existing