"""合并两条迁移线：题库表（b3da7b4eccfe）与 LS-lab 协调层（a3b4c5d6e7f8）

Revision ID: bf78c3ada3e8
Revises: a3b4c5d6e7f8
Create Date: 2026-09-26 11:54:30.444126

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bf78c3ada3e8'
down_revision: Union[str, Sequence[str], None] = 'a3b4c5d6e7f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
