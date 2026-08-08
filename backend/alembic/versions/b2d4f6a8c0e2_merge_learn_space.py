"""Merge learn-space chain into mainline (multi-head resolution).

Two chains existed:
- mainline: ... -> a1b2c3d4e5f6 (payments tables, incl. dev-dashboard merge)
- learn-space: 0a9a68d3d7fd -> 9e2c4f6a8b1d -> 3a5b7c9d1e2f -> 7f3c9a1b5d2e

This merge makes a single head so `alembic upgrade head` works again.
"""

from alembic import op

revision = "b2d4f6a8c0e2"
down_revision = ("a1b2c3d4e5f6", "7f3c9a1b5d2e")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
