"""Project persistence and ownership rules.

Same IDOR red line as conversations: every query that touches a project by
id MUST filter by user_id as well — "not yours" and "not there" are both
None -> 404.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.project import Project

NAME_MAX_CHARS = 100


async def create_project(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    name: str,
    agent: dict | None = None,
) -> Project:
    """Create a learn space; optional companion agent persona (onboarding v1)."""
    project = Project(
        user_id=user_id,
        name=name,
        agent_name=(agent or {}).get("agent_name"),
        agent_personality=(agent or {}).get("personality"),
        agent_teaching_style=(agent or {}).get("teaching_style"),
        agent_welcome=(agent or {}).get("welcome_message"),
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def get_owned_project(
    db: AsyncSession, *, user_id: uuid.UUID, project_id: uuid.UUID
) -> Project | None:
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def list_projects(
    db: AsyncSession, *, user_id: uuid.UUID, limit: int = 100, offset: int = 0
) -> list[Project]:
    result = await db.execute(
        select(Project)
        .where(Project.user_id == user_id)
        .order_by(Project.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars())


async def rename_project(
    db: AsyncSession, project: Project, *, name: str
) -> Project:
    project.name = name
    await db.commit()
    await db.refresh(project)
    return project


async def delete_project(db: AsyncSession, project: Project) -> None:
    # FK is ON DELETE SET NULL (拍板 2026-06-13): conversations inside fall
    # back to the main list, they are never cascade-deleted with the project.
    await db.delete(project)
    await db.commit()
