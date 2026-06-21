"""chapter_overviews table (cached chapter overview Markdown)

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-06-21 08:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'chapter_overviews',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('chapter_id', sa.UUID(), nullable=False),
        sa.Column('candidate_id', sa.UUID(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('markdown', sa.Text(), nullable=True),
        sa.Column('error_type', sa.String(), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("status in ('pending', 'generating', 'ready', 'failed')", name='ck_chapter_overviews_status'),
        sa.ForeignKeyConstraint(['candidate_id'], ['chapter_video_candidates.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chapter_id'], ['course_chapters.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('chapter_id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('chapter_overviews')
