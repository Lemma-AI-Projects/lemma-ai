"""Document-layer tables: the learn workspace's content layer.

Two tables — nothing more. A Page is a section/board entity that lives inside a
learn space (project); a Block is one TipTap node of a Page's content, stored as
JSONB. This replaces the Trilium experiment (engine/kb-engine) with a minimal
homegrown model (decision D1/D2 in planning/kb-doc-layer-execution-plan.md).

Deliberately no branches table (Trilium's tree): a single nullable
parent_page_id expresses the tree, which is enough for MVP. Content is JSONB at
block granularity, small enough that an outboard blob table buys nothing.

Conventions match models/project.py and models/free_course.py: UUID PKs,
server_default timestamps, camelCase wire schemas, IDOR enforced at the service
layer by project ownership.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base

PAGE_KINDS = ("note", "canvas", "imported", "folder")
PAGE_SOURCES = ("manual", "obsidian", "notion", "upload")
BLOCK_TYPES = (
    "paragraph",
    "heading",
    "list",
    "todo",
    "code",
    "quote",
    "divider",
    "image",
    "math",
    "callout",
)


class Page(Base):
    """A document/board entity owned by one learn space (project).

    `kind` is the shelter group key (note/canvas/imported/folder); `folder` is
    a pure container node with no blocks. `source` + `import_ref` keep the
    origin for the Phase 1/2 import & incremental-sync lines.
    """

    __tablename__ = "pages"
    __table_args__ = (
        Index("ix_pages_project_id", "project_id"),
        Index("ix_pages_parent_page_id", "parent_page_id"),
        CheckConstraint(
            "kind in ('note', 'canvas', 'imported', 'folder')",
            name="ck_pages_kind",
        ),
        CheckConstraint(
            "source in ('manual', 'obsidian', 'notion', 'upload')",
            name="ck_pages_source",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_page_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pages.id", ondelete="CASCADE"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False, server_default="note")
    source: Mapped[str] = mapped_column(
        String, nullable=False, server_default="manual"
    )
    import_ref: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class Block(Base):
    """One TipTap node of a Page, ordered by position within the page.

    `content` is the TipTap JSON ({type, content}) or, for Phase 1 imports, the
    raw markdown being held until conversion. `meta` reserves room for source
    mapping / wikilink targets so a lossy Markdown->Block import can be replayed
    without hitting the wall of irreversible conversion.
    """

    __tablename__ = "blocks"
    __table_args__ = (
        Index("ix_blocks_page_position", "page_id", "position"),
        CheckConstraint(
            "type in ('paragraph', 'heading', 'list', 'todo', 'code', 'quote', "
            "'divider', 'image', 'math', 'callout')",
            name="ck_blocks_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pages.id", ondelete="CASCADE"),
        nullable=False,
    )
    position: Mapped[int] = mapped_column(nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )