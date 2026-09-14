"""Doc-layer persistence and ownership rules.

Same IDOR red line as projects/conversations: every query that touches a page or
project by id MUST first prove the project belongs to the user. A page's
project_id is checked against the caller's owned projects — "not yours" for the
page and "no such project" for a foreign project_id collapse to the same None ->
404, so we never leak existence.

Blocks are saved whole-page (delete-then-insert in one transaction) with an
optimistic `updated_at` guard: the client sends the page version it last saw and
a mismatched guard aborts with DirtyPageError (409), never a silent last-writer-
wins.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.doc import Block, Page
from models.project import Project

PAGE_TITLE_MAX = 300


class DirtyPageError(Exception):
    """Page blocks were saved while another writer held a newer version."""


async def _owned_project_id(
    db: AsyncSession, *, user_id: uuid.UUID, project_id: uuid.UUID
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


async def get_owned_page(
    db: AsyncSession, *, user_id: uuid.UUID, page_id: uuid.UUID
) -> Page | None:
    result = await db.execute(
        select(Page)
        .join(Project, Project.id == Page.project_id)
        .where(Page.id == page_id, Project.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def list_project_pages(
    db: AsyncSession, *, user_id: uuid.UUID, project_id: uuid.UUID
) -> list[tuple[Page, str]] | None:
    """(page, project_name) for one owned project, or None if the project is
    not the caller's (IDs are not enumerated)."""
    result = await db.execute(
        select(Project.name).where(
            Project.id == project_id,
            Project.user_id == user_id,
        )
    )
    name = result.scalar_one_or_none()
    if name is None:
        return None
    pages = await db.execute(
        select(Page)
        .where(Page.project_id == project_id)
        .order_by(Page.updated_at.desc())
    )
    return [(page, name) for page in pages.scalars()]


async def list_all_pages(
    db: AsyncSession, *, user_id: uuid.UUID
) -> list[tuple[Page, str]]:
    """Cross-space list (page, project_name) for the /knowledge aggregate view."""
    result = await db.execute(
        select(Page, Project.name)
        .join(Project, Project.id == Page.project_id)
        .where(Project.user_id == user_id)
        .order_by(Page.updated_at.desc())
    )
    return [(page, name) for page, name in result.all()]


async def create_page(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    title: str,
    kind: str = "note",
    parent_page_id: uuid.UUID | None = None,
) -> Page | None:
    """Create a page inside an owned project. None when the project does not
    exist or does not belong to the user (IDs are not enumerated)."""
    if await _owned_project_id(db, user_id=user_id, project_id=project_id) is None:
        return None
    page = Page(
        project_id=project_id,
        parent_page_id=parent_page_id,
        title=title,
        kind=kind,
    )
    db.add(page)
    await db.commit()
    await db.refresh(page)
    return page


async def update_page(
    db: AsyncSession,
    page: Page,
    *,
    title: str | None = None,
    kind: str | None = None,
    parent_page_id: uuid.UUID | None = None,
) -> Page:
    if title is not None:
        page.title = title
    if kind is not None:
        page.kind = kind
    page.parent_page_id = parent_page_id
    await db.commit()
    await db.refresh(page)
    return page


async def delete_page(db: AsyncSession, page: Page) -> None:
    await db.delete(page)
    await db.commit()


async def get_page_blocks(
    db: AsyncSession, *, user_id: uuid.UUID, page_id: uuid.UUID
) -> tuple[Page, list[Block]] | None:
    page = await get_owned_page(db, user_id=user_id, page_id=page_id)
    if page is None:
        return None
    result = await db.execute(
        select(Block)
        .where(Block.page_id == page_id)
        .order_by(Block.position)
    )
    return page, list(result.scalars())


async def save_page_blocks(
    db: AsyncSession,
    page: Page,
    *,
    blocks: list[dict[str, Any]],
    expected_updated_at: datetime,
) -> Page | None:
    """Replace a page's blocks atomically. Returns None (and does NOT raise)
    on a stale-guard conflict so the caller can map it to a clean 409."""
    current = await db.execute(
        select(Page.updated_at).where(Page.id == page.id)
    )
    row = current.scalar_one_or_none()
    latest = row if row is not None else page.updated_at
    # Compare microsecond-truncated datetimes (SQLite/PG round-trip precision).
    if latest.replace(microsecond=0) != expected_updated_at.replace(microsecond=0):
        return None

    await db.execute(Block.__table__.delete().where(Block.page_id == page.id))
    for idx, raw in enumerate(blocks):
        db.add(
            Block(
                page_id=page.id,
                position=raw.get("position", idx),
                type=raw.get("type", "paragraph"),
                content=raw.get("content", {}),
                meta=raw.get("meta"),
            )
        )
    await db.commit()
    await db.refresh(page)
    return page