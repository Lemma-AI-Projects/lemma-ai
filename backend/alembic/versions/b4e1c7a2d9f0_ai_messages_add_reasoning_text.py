"""ai_messages add reasoning_text

Revision ID: b4e1c7a2d9f0
Revises: a7f4c2d9b8e1
Create Date: 2026-06-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4e1c7a2d9f0'
down_revision: Union[str, Sequence[str], None] = 'a7f4c2d9b8e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'ai_messages',
        sa.Column('reasoning_text', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('ai_messages', 'reasoning_text')
