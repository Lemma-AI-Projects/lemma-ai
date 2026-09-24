"""Notifications: one thing the system decided to tell the learner.

This table is the Feed's storage for notifications, and it is deliberately the
only place a notification can live. "Notification Sender" (see
`services/notification_service.py`) writes rows here; the Calendar/Feed page
reads them. No second store, no per-channel copy.

The shape is the whole design and it is intentionally thin:

  - `type` is a short label (`reminder` / `notification` / `system`, enforced by
    the service, not by a CHECK) so the feed can style an item without the
    sender having to know anything about the UI.
  - `metadata` is free-form JSONB. It is where a future Scheduler or Coordinator
    can park structure ("which knowledge item, which space, which attempt")
    WITHOUT a migration and without this table learning about Learner State —
    the moment it grows a typed column per producer, notification storage has
    become a domain model.
  - `created_at` is the notification's timestamp: when it was sent. The feed
    orders and places items by it, so it is the only time column.

Deliberately absent: `read_at`, `scheduled_for`, `priority`, `channel`,
`delivered_at`. V0 shows notifications in the feed and does nothing else;
every one of those columns would imply behaviour (unread counts, delivery
tracking, ranking) that no code implements yet.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class Notification(Base):
    """One delivered notification, owned by exactly one user."""

    __tablename__ = "notifications"
    __table_args__ = (
        # The only read V0 makes: this user's notifications, newest first.
        Index("ix_notifications_user_created", "user_id", "created_at"),
        CheckConstraint(
            "length(btrim(title)) > 0", name="ck_notifications_title_not_blank"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Same IDOR discipline as space_memories: the owner is denormalised onto the
    # row so "only mine" needs no join on every read.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False, default="reminder")
    # Attribute is `meta`, column is `metadata`: `metadata` is reserved on a
    # declarative class (it is `Base.metadata`), and renaming the COLUMN instead
    # would put the reserved-ish name on the wire contract, which is worse.
    meta: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        server_default="{}",
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
