"""User onboarding state on profiles.

- `has_completed_onboarding` (bool, default false) — gate for /onboarding.
- `onboarding_interests` (text, nullable) — free-form interests captured on the
  capacity-first screen; seeds the first learn space / agent generation.
"""

import sqlalchemy as sa
from alembic import op

revision = "c4e6a8b0d2f4"
down_revision = "b2d4f6a8c0e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "profiles",
        sa.Column(
            "has_completed_onboarding",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "profiles",
        sa.Column("onboarding_interests", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("profiles", "onboarding_interests")
    op.drop_column("profiles", "has_completed_onboarding")
