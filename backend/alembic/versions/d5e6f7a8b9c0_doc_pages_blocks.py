"""doc-layer: pages + blocks tables (re-lands main-v2's doc layer on main-v3)

Single-head revision for **main-v3**, chained onto c9d0e1f2a3b4 (knowledge).
Additive, no existing rows touched:
  - pages: a document/board entity owned by a learn space (projects), with a
    nullable parent_page_id for tree nesting and kind/source enums that the
    shelter drawer and import lines key off.
  - blocks: one TipTap node per page (JSONB content), indexed by page + position.

**This reverses a deliberate deletion.** e6f1a3c8b2d7 dropped these two tables
as "main-v2 leftovers" with the note "本链从未创建过这些对象" — main-v3's chain
had never created them. They are being re-created here on purpose, to give
Learn Space a Data Layer (Sources = Space Context): a place for material the
space manages, which the Global Agent can read and write back.

The bodies are identical to main-v2's f7a8b9c0d1e2; only the chain position
differs (that revision hangs off v2's calendar head, which this chain does not
have).

NOT YET APPLIED as of 2026-09-21 — see core/config.py `doc_full_api_enabled`,
which defaults False so the /api/v1/pages surface answers 503 (not a 500 from a
missing table) until this migration runs.

Revision ID: d5e6f7a8b9c0
Revises: c9d0e1f2a3b4
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, Sequence[str], None] = "c9d0e1f2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pages",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "parent_page_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("pages.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False, server_default="note"),
        sa.Column(
            "source", sa.String(), nullable=False, server_default="manual"
        ),
        sa.Column("import_ref", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_check_constraint(
        "ck_pages_kind",
        "pages",
        "kind in ('note', 'canvas', 'imported', 'folder')",
    )
    op.create_check_constraint(
        "ck_pages_source",
        "pages",
        "source in ('manual', 'obsidian', 'notion', 'upload')",
    )
    op.create_index("ix_pages_project_id", "pages", ["project_id"])
    op.create_index("ix_pages_parent_page_id", "pages", ["parent_page_id"])

    op.create_table(
        "blocks",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "page_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("pages.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("content", sa.dialects.postgresql.JSONB(), nullable=False),
        sa.Column("meta", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_check_constraint(
        "ck_blocks_type",
        "blocks",
        "type in ('paragraph', 'heading', 'list', 'todo', 'code', 'quote', "
        "'divider', 'image', 'math', 'callout')",
    )
    op.create_index("ix_blocks_page_position", "blocks", ["page_id", "position"])


def downgrade() -> None:
    op.drop_index("ix_blocks_page_position", "blocks")
    op.drop_constraint("ck_blocks_type", "blocks", type_="check")
    op.drop_table("blocks")
    op.drop_index("ix_pages_parent_page_id", "pages")
    op.drop_index("ix_pages_project_id", "pages")
    op.drop_constraint("ck_pages_source", "pages", type_="check")
    op.drop_constraint("ck_pages_kind", "pages", type_="check")
    op.drop_table("pages")