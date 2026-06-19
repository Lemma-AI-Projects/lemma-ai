"""provider_usage_logs: actor_id nullable

Revision ID: f4a2c9b1d7e3
Revises: 8270c4106071
Create Date: 2026-06-19 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4a2c9b1d7e3'
down_revision: Union[str, Sequence[str], None] = '8270c4106071'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Relax provider_usage_logs.actor_id to nullable: free self-built search
    providers (ytdlp/bili) have no Apify actor and record NULL (forward-
    compatible — widening a column never breaks existing rows)."""
    op.alter_column(
        "provider_usage_logs",
        "actor_id",
        existing_type=sa.String(),
        nullable=True,
    )


def downgrade() -> None:
    """Restore NOT NULL (only valid once any NULL actor_id rows are cleared)."""
    op.alter_column(
        "provider_usage_logs",
        "actor_id",
        existing_type=sa.String(),
        nullable=False,
    )
