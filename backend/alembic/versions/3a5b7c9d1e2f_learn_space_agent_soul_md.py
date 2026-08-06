"""learn space: add agent_soul_md (full SOUL.md persona document)

Revision ID: 3a5b7c9d1e2f
Revises: 9e2c4f6a8b1d
Create Date: 2026-08-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "3a5b7c9d1e2f"
down_revision: str | None = "9e2c4f6a8b1d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("agent_soul_md", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "agent_soul_md")
