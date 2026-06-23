"""courses.status add 'materializing' (materialization gate phase)

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-06-22 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_OLD = (
    "status in ('intake', 'outline_ready', 'organizing', 'building', "
    "'ready', 'failed')"
)
_NEW = (
    "status in ('intake', 'outline_ready', 'organizing', 'building', "
    "'materializing', 'ready', 'failed')"
)


def upgrade() -> None:
    """Upgrade schema."""
    # A CHECK constraint can't be altered in place; drop + re-add with the new value.
    op.drop_constraint('ck_courses_status', 'courses', type_='check')
    op.create_check_constraint('ck_courses_status', 'courses', _NEW)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('ck_courses_status', 'courses', type_='check')
    op.create_check_constraint('ck_courses_status', 'courses', _OLD)
