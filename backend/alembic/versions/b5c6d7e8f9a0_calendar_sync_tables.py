"""add calendar sync tables

Single-head revision chained onto the free-course migration (d0e1f2a3b4c5).
Additive only: two new tables (calendar_connections, synced_events), no existing
table is touched.

Revision ID: b5c6d7e8f9a0
Revises: d0e1f2a3b4c5
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "b5c6d7e8f9a0"
down_revision: Union[str, Sequence[str], None] = "d0e1f2a3b4c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "calendar_connections",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("access_token", sa.Text(), nullable=True),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column(
            "token_expires_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.Column("caldav_username", sa.String(255), nullable=True),
        sa.Column("caldav_password", sa.Text(), nullable=True),
        sa.Column(
            "enabled", sa.Boolean(), nullable=False, server_default="true"
        ),
        sa.Column(
            "sync_direction", sa.String(20), nullable=False, server_default="read_only"
        ),
        sa.Column("external_calendar_id", sa.String(255), nullable=True),
        sa.Column("external_calendar_name", sa.String(255), nullable=True),
        sa.Column("sync_token", sa.Text(), nullable=True),
        sa.Column("ctag", sa.String(100), nullable=True),
        sa.Column(
            "last_synced_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.Column("sync_error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "sync_direction IN ('read_only', 'write_only', 'bidirectional')",
            name="ck_calendar_sync_direction",
        ),
    )
    op.create_index(
        "ix_calendar_connections_user_provider",
        "calendar_connections",
        ["user_id", "provider"],
    )

    op.create_table(
        "synced_events",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "connection_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("calendar_connections.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("external_event_id", sa.String(255), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column(
            "start_time",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "end_time",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "all_day", sa.Boolean(), nullable=False, server_default="false"
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("location", sa.Text(), nullable=True),
        sa.Column("recurrence_rule", sa.Text(), nullable=True),
        sa.Column(
            "sync_status", sa.String(20), nullable=False, server_default="synced"
        ),
        sa.Column("local_event_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "external_updated_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "last_synced_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "is_deleted", sa.Boolean(), nullable=False, server_default="false"
        ),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_synced_events_connection", "synced_events", ["connection_id"])
    op.create_index(
        "ix_synced_events_external_id", "synced_events", ["external_event_id"]
    )
    op.create_index("ix_synced_events_status", "synced_events", ["sync_status"])
    op.create_index(
        "uq_synced_events_conn_ext",
        "synced_events",
        ["connection_id", "external_event_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_synced_events_conn_ext")
    op.drop_index("ix_synced_events_status")
    op.drop_index("ix_synced_events_external_id")
    op.drop_index("ix_synced_events_connection")
    op.drop_table("synced_events")
    op.drop_index("ix_calendar_connections_user_provider")
    op.drop_table("calendar_connections")
