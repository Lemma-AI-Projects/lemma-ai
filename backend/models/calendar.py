import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class CalendarConnection(Base):
    """A user's connection to an external calendar provider."""

    __tablename__ = "calendar_connections"
    __table_args__ = (
        Index("ix_calendar_connections_user_provider", "user_id", "provider"),
        CheckConstraint(
            "sync_direction IN ('read_only', 'write_only', 'bidirectional')",
            name="ck_calendar_sync_direction",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider: Mapped[str] = mapped_column(String(20), nullable=False)  # google | apple

    # OAuth tokens (Google only)
    access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[object | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )

    # CalDAV credentials (Apple only)
    caldav_username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    caldav_password: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Sync control
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sync_direction: Mapped[str] = mapped_column(
        String(20), default="read_only", nullable=False
    )
    external_calendar_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    external_calendar_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Incremental sync tokens
    sync_token: Mapped[str | None] = mapped_column(Text, nullable=True)  # Google
    ctag: Mapped[str | None] = mapped_column(String(100), nullable=True)  # Apple

    # Status
    last_synced_at: Mapped[object | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    sync_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[object] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[object] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class SyncedEvent(Base):
    """An event synced from an external calendar."""

    __tablename__ = "synced_events"
    __table_args__ = (
        Index("ix_synced_events_connection", "connection_id"),
        Index("ix_synced_events_external_id", "external_event_id"),
        Index("ix_synced_events_status", "sync_status"),
        Index(
            "uq_synced_events_conn_ext",
            "connection_id",
            "external_event_id",
            unique=True,
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    connection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("calendar_connections.id", ondelete="CASCADE"),
        nullable=False,
    )

    external_event_id: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    start_time: Mapped[object] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False
    )
    end_time: Mapped[object] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False
    )
    all_day: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    recurrence_rule: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Local status
    sync_status: Mapped[str] = mapped_column(
        String(20), default="synced", nullable=False
    )  # synced | pending_push | conflict
    local_event_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    external_updated_at: Mapped[object] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False
    )
    last_synced_at: Mapped[object] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[object] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[object] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
