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

Two writers exist and they need different primitives:
  - the user's editor: whole-page replace under the version guard
    (`save_page_blocks`) — a person can delete a block, so replace is the
    honest semantic;
  - the Agent and the importer: append-only (`append_blocks`,
    `create_page_with_blocks`) — neither ever holds a version to guard with,
    and neither should be able to erase what it did not write.
"""

import re
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
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


# ---------------------------------------------------------------------------
# Append-only writers (the Agent and the importer)
# ---------------------------------------------------------------------------


async def create_page_with_blocks(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    title: str,
    blocks: list[dict[str, Any]],
    kind: str = "note",
    source: str = "manual",
) -> tuple[Page, list[Block]] | None:
    """Create a page and its blocks in one transaction.

    None when the project is not the caller's (same IDOR rule as create_page).
    Used by both the Agent's save_note (kind=note) and the importer
    (kind=imported, source=upload) — one writer, one behaviour, two callers.
    """
    if await _owned_project_id(db, user_id=user_id, project_id=project_id) is None:
        return None
    page = Page(
        project_id=project_id,
        parent_page_id=None,
        title=title.strip()[:PAGE_TITLE_MAX] or "未命名",
        kind=kind,
        source=source,
    )
    db.add(page)
    # Flush (not commit) to get the page id and keep page+blocks atomic: a
    # failure while inserting blocks must not leave an empty page behind.
    await db.flush()
    created = _add_blocks(db, page_id=page.id, start=0, blocks=blocks)
    await db.commit()
    await db.refresh(page)
    return page, created


async def append_blocks(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    page_id: uuid.UUID,
    blocks: list[dict[str, Any]],
) -> tuple[Page, list[Block]] | None:
    """Append blocks to the end of an existing page. None per the IDOR rule.

    Deliberately NOT `save_page_blocks`: that one replaces the whole page and
    requires `expected_updated_at`, a version the Agent has no way to know (it
    never read the page's version, and a stale-guard failure would surface to
    the model as an unexplainable 409). Reading the current maximum position
    inside this transaction is the trade: it gives up the multi-writer guard
    that the user's editor keeps. Acceptable because appends are additive —
    two concurrent appends interleave but neither destroys the other's block,
    which is the exact failure mode the guard exists to prevent for replaces.

    The page's updated_at is bumped by hand: the row itself is not modified,
    and without this a page that just received content would keep sorting as
    "untouched" in the drawer and in the prompt's最近改动 ordering.
    """
    page = await get_owned_page(db, user_id=user_id, page_id=page_id)
    if page is None:
        return None
    result = await db.execute(
        select(func.max(Block.position)).where(Block.page_id == page.id)
    )
    start = (result.scalar_one_or_none() or -1) + 1
    created = _add_blocks(db, page_id=page.id, start=start, blocks=blocks)
    page.updated_at = func.now()
    await db.commit()
    await db.refresh(page)
    return page, created


def _add_blocks(
    db: AsyncSession,
    *,
    page_id: uuid.UUID,
    start: int,
    blocks: list[dict[str, Any]],
) -> list[Block]:
    created: list[Block] = []
    for idx, raw in enumerate(blocks):
        block = Block(
            page_id=page_id,
            position=start + idx,
            type=raw.get("type", "paragraph"),
            content=raw.get("content", {}),
            meta=raw.get("meta"),
        )
        db.add(block)
        created.append(block)
    return created


# ---------------------------------------------------------------------------
# Markdown → blocks (pure functions; no database, no storage)
# ---------------------------------------------------------------------------

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
_LIST_RE = re.compile(r"^\s*(?:([-*+])|(\d{1,9})[.)])\s+(.*)$")
_FENCE_RE = re.compile(r"^\s*```\s*([A-Za-z0-9_+#-]*)\s*$")
_DIVIDER_RE = re.compile(r"^\s*(?:-{3,}|\*{3,}|_{3,})\s*$")


def markdown_to_blocks(text: str) -> list[dict[str, Any]]:
    """Parse Markdown/text into the block payloads V1 understands.

    Content shapes are Lemma's own, not TipTap's: the rich-text editor is not
    part of V1 (see planning/space-context-execution-plan.md §8), and a lossy
    half-TipTap document would be worse than a shape that says exactly what it
    holds. `meta` stays free for the eventual TipTap mapping.

        heading   {"level": 1-6, "text": str}
        paragraph {"text": str}
        list      {"ordered": bool, "items": [str]}
        code      {"language": str, "text": str}
        quote     {"text": str}
        divider   {}

    Everything not recognised degrades to a paragraph rather than being
    dropped: an import that silently loses a line is worse than an ugly one.
    """
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    blocks: list[dict[str, Any]] = []
    paragraph: list[str] = []

    def flush_paragraph() -> None:
        joined = " ".join(part.strip() for part in paragraph).strip()
        if joined:
            blocks.append({"type": "paragraph", "content": {"text": joined}})
        paragraph.clear()

    i = 0
    total = len(lines)
    while i < total:
        line = lines[i]

        fence = _FENCE_RE.match(line)
        if fence:
            flush_paragraph()
            i += 1
            body: list[str] = []
            while i < total and not _FENCE_RE.match(lines[i]):
                body.append(lines[i])
                i += 1
            i += 1  # consume the closing fence (absent at EOF: fine)
            # The file's own trailing newline, and the blank line before a
            # closing fence, are transport noise — not code. Keep interior
            # blank lines, drop the trailing ones.
            while body and not body[-1].strip():
                body.pop()
            blocks.append(
                {
                    "type": "code",
                    "content": {
                        "language": fence.group(1) or "",
                        "text": "\n".join(body),
                    },
                }
            )
            continue

        if not line.strip():
            flush_paragraph()
            i += 1
            continue

        heading = _HEADING_RE.match(line)
        if heading:
            flush_paragraph()
            blocks.append(
                {
                    "type": "heading",
                    "content": {
                        "level": len(heading.group(1)),
                        "text": heading.group(2).strip(),
                    },
                }
            )
            i += 1
            continue

        if _DIVIDER_RE.match(line):
            flush_paragraph()
            blocks.append({"type": "divider", "content": {}})
            i += 1
            continue

        item = _LIST_RE.match(line)
        if item:
            flush_paragraph()
            ordered = item.group(2) is not None
            items: list[str] = []
            while i < total:
                following = _LIST_RE.match(lines[i])
                if following is None or (following.group(2) is not None) != ordered:
                    break
                items.append(following.group(3).strip())
                i += 1
            blocks.append(
                {"type": "list", "content": {"ordered": ordered, "items": items}}
            )
            continue

        if line.lstrip().startswith(">"):
            flush_paragraph()
            quoted: list[str] = []
            while i < total and lines[i].lstrip().startswith(">"):
                quoted.append(lines[i].lstrip()[1:].strip())
                i += 1
            blocks.append(
                {
                    "type": "quote",
                    "content": {"text": " ".join(x for x in quoted if x)},
                }
            )
            continue

        paragraph.append(line)
        i += 1

    flush_paragraph()
    return blocks


def blocks_to_text(blocks: list[Block]) -> str:
    """Flatten stored blocks back to Markdown for the Agent's read_page.**

    The reverse of markdown_to_blocks for every shape V1 writes, so what the
    model reads is what the user would see. Unknown types fall back to their
    `text` field rather than being skipped — an empty answer would make the
    model think the board is empty.
    """
    out: list[str] = []
    for block in blocks:
        content = block.content or {}
        if block.type == "heading":
            level = int(content.get("level") or 1)
            out.append(f"{'#' * max(1, min(6, level))} {content.get('text', '')}")
        elif block.type == "list":
            items = content.get("items") or []
            for index, item in enumerate(items, start=1):
                out.append(f"{index}. {item}" if content.get("ordered") else f"- {item}")
        elif block.type == "code":
            language = content.get("language") or ""
            out.append(f"```{language}\n{content.get('text', '')}\n```")
        elif block.type == "quote":
            out.append(f"> {content.get('text', '')}")
        elif block.type == "divider":
            out.append("---")
        else:
            out.append(str(content.get("text", "")))
    return "\n\n".join(part for part in out if part.strip())
