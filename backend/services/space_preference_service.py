"""Space preferences: how to teach *in this Learn Space*.

The middle layer of the override chain (conversation > space > home). It is
small on purpose — one statement, one project — and it is a separate module from
`user_home_service` because the two must be able to disagree: a space that asks
for detailed explanations has to leave a Home that asks for concise ones
untouched, and that is only guaranteed if the two never share a write path.

Provenance is not optional here. A space preference belongs to the space, but it
is still *the user's* setting, so it is always attributed to the person who set
it and the conversation it came from.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.project import Project
from models.user_home import SpacePreference


async def list_for_space(
    db: AsyncSession, *, user_id: uuid.UUID, project_id: uuid.UUID
) -> list[SpacePreference]:
    """This space's preferences, oldest first. Empty is the normal state."""
    rows = (
        await db.execute(
            select(SpacePreference)
            .where(
                SpacePreference.project_id == project_id,
                SpacePreference.user_id == user_id,
            )
            .order_by(SpacePreference.created_at)
        )
    ).scalars()
    return list(rows)


async def set_preference(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    text: str,
    conversation_id: uuid.UUID | None = None,
) -> SpacePreference | None:
    """Record one preference for this space. None when the space is not theirs.

    Ownership is checked against `projects` before the write, the same way
    `space_memory_service.record` does it — a caller holding a project id it does
    not own gets "no such space" rather than a row.
    """
    cleaned = " ".join(text.split())
    if not cleaned:
        raise ValueError("space preference text must not be blank")
    owned = (
        await db.execute(
            select(Project.id).where(
                Project.id == project_id, Project.user_id == user_id
            )
        )
    ).scalar_one_or_none()
    if owned is None:
        return None

    existing = (
        await db.execute(
            select(SpacePreference).where(
                SpacePreference.project_id == project_id,
                SpacePreference.user_id == user_id,
                SpacePreference.text == cleaned,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    row = SpacePreference(
        project_id=project_id,
        user_id=user_id,
        text=cleaned,
        source_conversation_id=conversation_id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def delete_preference(
    db: AsyncSession, *, user_id: uuid.UUID, preference_id: uuid.UUID
) -> bool:
    row = (
        await db.execute(
            select(SpacePreference).where(
                SpacePreference.id == preference_id,
                SpacePreference.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        return False
    await db.delete(row)
    await db.commit()
    return True
