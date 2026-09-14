"""doc-layer: pages + blocks tables (homegrown Page+Block model)

Single-head revision chained onto b5c6d7e8f9a0 (calendar), this branch's head.
Additive, no existing rows touched:
  - pages: a document/board entity owned by a learn space (projects), with a
    nullable parent_page_id for tree nesting and kind/source enums that the
    shelter drawer and import lines key off.
  - blocks: one TipTap node per page (JSONB content), indexed by page + position.

Replaces the Trilium route (engine/kb-engine, kept frozen as an audit trail).

Revision ID: f7a8b9c0d1e2
Revises: b5c6d7e8f9a0
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "f7a8b9c0d1e2"
down_revision: Union[str, Sequence[str], None] = "b5c6d7e8f9a0"
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