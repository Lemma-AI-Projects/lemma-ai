"""chapter_video_assets add download_backend

Revision ID: a7f4c2d9b8e1
Revises: eca285886d04
Create Date: 2026-06-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7f4c2d9b8e1'
down_revision: Union[str, Sequence[str], None] = 'eca285886d04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'chapter_video_assets',
        sa.Column('download_backend', sa.String(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('chapter_video_assets', 'download_backend')
