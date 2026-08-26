"""create board_snapshots (opaque tldraw board state per learn space)

Revision ID: f1a2b3c4d5e6
Revises: d3e5f7a9b1c3
Create Date: 2026-08-26

P0 Board 后端持久化：把画板快照从「仅 localStorage」沉到后端，按
learn space（project）1:1（project_id 主键）落 JSONB，支持多端/分享。
- project_id 为主键外键，project 删除 CASCADE 清理，不残留孤儿。
- 归属校验由后端 IDOR 保证（与 projects/desmos_graphs 一致，不经
  PostgREST，故本表不设 RLS）。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'd3e5f7a9b1c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'board_snapshots',
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column(
            'snapshot',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['project_id'], ['projects.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('project_id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('board_snapshots')