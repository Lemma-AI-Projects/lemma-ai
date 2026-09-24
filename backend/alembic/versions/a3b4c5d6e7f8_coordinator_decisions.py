"""coordinator_decisions: what the decision layer decided, and why

Single-head revision for LS-lab, chained onto f2a3b4c5d6e7 (the scheduler's
tasks). Additive — a new table, nothing existing changes meaning.

  - coordinator_decisions: one row per Coordinator decision. The event, the
    action, the target, the reason, the urgency, and what the executor did.

Deliberately absent: status / consumed_at / superseded_by (no lifecycle in V0)
and any copy of the Learner State the decision saw (derived data is never cached
beside its inputs — the reason string names the facts that mattered).

Revision ID: a3b4c5d6e7f8
Revises: f2a3b4c5d6e7
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a3b4c5d6e7f8"
down_revision: Union[str, Sequence[str], None] = "f2a3b4c5d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "coordinator_decisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column(
            "event_payload",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("target", sa.Text(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("urgency", sa.String(), nullable=False),
        sa.Column("effect", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "length(btrim(reason)) > 0",
            name="ck_coordinator_decisions_reason_not_blank",
        ),
        # CASCADE for the user (a decision without its owner is meaningless);
        # CASCADE for the space too — a decision about a deleted space is no
        # longer a fact about anything.
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["profiles.id"],
            name="coordinator_decisions_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name="coordinator_decisions_project_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="coordinator_decisions_pkey"),
    )
    op.create_index(
        "ix_coordinator_decisions_user_created",
        "coordinator_decisions",
        ["user_id", "created_at"],
    )
    op.create_index(
        "ix_coordinator_decisions_project_created",
        "coordinator_decisions",
        ["project_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_coordinator_decisions_project_created",
        table_name="coordinator_decisions",
    )
    op.drop_index(
        "ix_coordinator_decisions_user_created", table_name="coordinator_decisions"
    )
    op.drop_table("coordinator_decisions")
