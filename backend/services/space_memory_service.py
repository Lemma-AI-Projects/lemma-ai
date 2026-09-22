"""Space Memory persistence: what this space remembers, and for whom.

Two operations, and no third. V0 has no update, no delete, no merge and no
expiry — the Agent writes a memory, the assembly reads the space's memories.
Everything else in the plan's non-goal list would live here if it ever arrived.

Ownership follows the same IDOR rule as the doc layer: every query proves the
project belongs to the caller first, and "not yours" collapses with "no such
project" into the same None (the API turns it into a 404 without leaking
existence).

Deduplication is deliberately dumb — byte-for-byte equal text inside the same
space is one memory, not two. It exists to stop the worst-looking failure (the
same decision recorded eleven times by eleven turns), not to judge meaning;
paraphrases are two memories, which the plan lists as a known V0 limitation.
"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.ai_conversation import AiConversation
from models.project import Project
from models.space_memory import SpaceMemory

# A memory is a sentence or two. The cap is a guard against a runaway model
# writing an essay into a field the prompt will replay on every future turn.
TEXT_MAX_CHARS = 1000


async def _owned_project_id(
    db: AsyncSession, *, user_id: uuid.UUID, project_id: uuid.UUID | None
) -> uuid.UUID | None:
    if project_id is None:
        return None
    result = await db.execute(
        select(Project.id).where(
            Project.id == project_id,
            Project.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def record(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    project_id: uuid.UUID | None,
    text: str,
    conversation_id: uuid.UUID | None = None,
) -> tuple[SpaceMemory, bool] | None:
    """Write one memory. Returns (memory, created), or None if not the caller's.

    `created=False` means the exact same text was already remembered in this
    space — the existing row is returned instead of a duplicate. Reusing the row
    (rather than erroring) is what keeps the tool's answer simple: the agent
    tells the user what is remembered, and it is true either way.
    """
    if await _owned_project_id(db, user_id=user_id, project_id=project_id) is None:
        return None

    cleaned = text.strip()[:TEXT_MAX_CHARS]
    if not cleaned:
        raise ValueError("empty memory text")

    existing = (
        await db.execute(
            select(SpaceMemory).where(
                SpaceMemory.project_id == project_id,
                SpaceMemory.text == cleaned,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing, False

    memory = SpaceMemory(
        project_id=project_id,
        user_id=user_id,
        text=cleaned,
        source_conversation_id=conversation_id,
    )
    db.add(memory)
    await db.commit()
    await db.refresh(memory)
    return memory, True


async def list_for_space(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    limit: int,
) -> list[tuple[SpaceMemory, str]] | None:
    """This space's memories, newest first, each with its source conversation.

    The title comes back alongside the row so the prompt and the panel can say
    where a memory came from without a second lookup; a memory whose
    conversation was deleted keeps a NULL title and is reported as such.
    None means the project is not the caller's (IDOR); an empty list means the
    space simply has no memories yet — the two are different answers and the
    caller must not merge them.
    """
    if await _owned_project_id(db, user_id=user_id, project_id=project_id) is None:
        return None
    rows = (
        await db.execute(
            select(SpaceMemory, AiConversation.title)
            .outerjoin(
                AiConversation,
                SpaceMemory.source_conversation_id == AiConversation.id,
            )
            .where(SpaceMemory.project_id == project_id)
            .order_by(SpaceMemory.created_at.desc())
            .limit(limit)
        )
    ).all()
    return [(memory, title or "") for memory, title in rows]


async def count_for_space(
    db: AsyncSession, *, user_id: uuid.UUID, project_id: uuid.UUID
) -> int:
    """How many memories the space holds in total.

    Separate from the capped list on purpose: the prompt says "…and N older
    memories not shown" and the panel shows the total, so a space that outgrows
    the cap does not silently look smaller than it is.
    """
    if await _owned_project_id(db, user_id=user_id, project_id=project_id) is None:
        return 0
    result = await db.execute(
        select(func.count()).select_from(SpaceMemory).where(
            SpaceMemory.project_id == project_id
        )
    )
    return int(result.scalar_one())


__all__ = [
    "TEXT_MAX_CHARS",
    "count_for_space",
    "list_for_space",
    "record",
]
