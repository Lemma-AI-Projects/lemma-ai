"""notifications: what the system told the learner, stored as Feed items

Single-head revision for LS-lab, chained onto d3e4f5a6b7c8 (the conversation
method column). Additive — a new table, nothing existing changes meaning.

  - notifications: one delivered notification, owned by one user. This is the
    ONLY storage a notification has; the sender writes here and the
    Calendar/Feed page reads here. It is NOT a queue, NOT an outbox and NOT a
    delivery log — the table holds what the learner was actually told.

Deliberately absent: read_at, scheduled_for, priority, channel, delivered_at.
V0 shows an item in the feed and fires a browser notification; unread counts,
scheduling and delivery tracking are behaviour nothing implements yet, and a
column that implies behaviour is a promise the code cannot keep.

Scope: it knows nothing about spaces, knowledge items or methods. Anything a
future Scheduler wants to attach goes in `metadata` (JSONB) — that is the seam
that keeps this table from becoming a domain model.

Revision ID: e1f2a3b4c5d6
Revises: d3e4f5a6b7c8
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, Sequence[str], None] = "d3e4f5a6b7c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "type",
            sa.String(),
            nullable=False,
            server_default="reminder",
        ),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "length(btrim(title)) > 0", name="ck_notifications_title_not_blank"
        ),
        # CASCADE: a notification without its owner is meaningless.
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["profiles.id"],
            name="notifications_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="notifications_pkey"),
    )
    op.create_index(
        "ix_notifications_user_created",
        "notifications",
        ["user_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_notifications_user_created", table_name="notifications")
    op.drop_table("notifications")
