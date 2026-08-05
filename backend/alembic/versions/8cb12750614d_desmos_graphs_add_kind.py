"""desmos_graphs add kind

Revision ID: 8cb12750614d
Revises: 7aba5ac01dc3
Create Date: 2026-07-09 19:51:38.223293

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8cb12750614d'
down_revision: Union[str, Sequence[str], None] = '7aba5ac01dc3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('desmos_graphs', sa.Column('kind', sa.String(), server_default='2d', nullable=False))
    # autogenerate misses check constraints on add_column; keep models/ truth.
    op.create_check_constraint(
        'ck_desmos_graphs_kind', 'desmos_graphs', "kind in ('2d', '3d')"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('ck_desmos_graphs_kind', 'desmos_graphs', type_='check')
    op.drop_column('desmos_graphs', 'kind')
