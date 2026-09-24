"""scheduled_tasks: the Scheduler's promises, persisted

Single-head revision for LS-lab, chained onto e1f2a3b4c5d6 (the notifications
table). Additive — a new table, nothing existing changes meaning.

  - scheduled_tasks: one future event. `run_at` is when it must happen,
    `type` + `payload` is what must happen, `status` says whether it still has to.
    The Scheduler reads this table to answer its only question ("is anything
    due?") and writes `status` to answer "has this already happened?".

Deliberately absent: reason, priority, recurrence rule, attempts, retry_at,
lease/worker id, agent_id. V0's runner is one in-process loop and its decision is
"run_at <= now"; every column above would imply behaviour (ranking, retry, cron,
multi-worker leasing) that no code implements yet.

Scope: this table does not know what a notification is beyond the string in
`type` — the Scheduler hands `payload` to the sender and never builds content.

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f2a3b4c5d6e7"
down_revision: Union[str, Sequence[str], None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "scheduled_tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "run_at", postgresql.TIMESTAMP(timezone=True), nullable=False
        ),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column(
            "payload",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "status", sa.String(), nullable=False, server_default="pending"
        ),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "executed_at", postgresql.TIMESTAMP(timezone=True), nullable=True
        ),
        sa.Column("error", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "length(btrim(type)) > 0", name="ck_scheduled_tasks_type_not_blank"
        ),
        # CASCADE: a task without its owner is meaningless (and must never be
        # run for nobody).
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["profiles.id"],
            name="scheduled_tasks_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="scheduled_tasks_pkey"),
    )
    # The runner: "pending, due" — the hot path, taken every poll.
    op.create_index(
        "ix_scheduled_tasks_status_run_at",
        "scheduled_tasks",
        ["status", "run_at"],
    )
    # The Calendar: one user's tasks in time order.
    op.create_index(
        "ix_scheduled_tasks_user_run_at",
        "scheduled_tasks",
        ["user_id", "run_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_scheduled_tasks_user_run_at", table_name="scheduled_tasks")
    op.drop_index("ix_scheduled_tasks_status_run_at", table_name="scheduled_tasks")
    op.drop_table("scheduled_tasks")
