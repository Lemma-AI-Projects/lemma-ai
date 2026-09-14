"""free-course: add courses.tuning_json (per-course tunable projections)

Single-head revision chained onto f7a8b9c0d1e2 (doc-layer), this branch's
head. Additive, no existing rows touched: adds a nullable JSONB column holding
the free-course per-course tunable projections (volume/depth/focus/pace), as
persisted by the Free-Course persona. Null means the course falls back to
persona defaults.

Revision ID: a5b3c9d6e1f4
Revises: f7a8b9c0d1e2
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "a5b3c9d6e1f4"
down_revision: Union[str, Sequence[str], None] = "f7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "courses",
        sa.Column(
            "tuning_json", sa.dialects.postgresql.JSONB(), nullable=True
        ),
    )


def downgrade() -> None:
    op.drop_column("courses", "tuning_json")