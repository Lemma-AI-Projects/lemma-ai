import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class AiConversation(Base):
    __tablename__ = "ai_conversations"
    # Sidebar query is WHERE user_id ORDER BY updated_at DESC — the composite
    # index serves filter + order in one pass and (leftmost column) covers
    # plain user_id lookups, so no separate single-column index.
    # Project chat list is WHERE project_id ORDER BY updated_at DESC — same
    # pattern, own composite.
    __table_args__ = (
        Index("ix_ai_conversations_user_id_updated_at", "user_id", "updated_at"),
        Index(
            "ix_ai_conversations_project_id_updated_at", "project_id", "updated_at"
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
    # Single-home project link (拍板 2026-06-13): a conversation lives in at
    # most one project. SET NULL on project delete — conversations fall back
    # to the main list, never cascade-deleted (data safety over tidiness).
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class AiMessage(Base):
    """Dual-track message storage (终稿第十一章, 防框架 schema 锁定).

    role + content_text are the SOURCE OF TRUTH (display, search, migration).
    raw_parts_json is an optional attachment: the framework-serialized message
    (ModelMessagesTypeAdapter) for exact multimodal/tool-call history rebuild.
    A framework major upgrade can never break the neutral columns.
    """

    __tablename__ = "ai_messages"
    __table_args__ = (
        CheckConstraint(
            "role in ('system', 'user', 'assistant')",
            name="ck_ai_messages_role",
        ),
        # History rebuild/display is WHERE conversation_id ORDER BY created_at;
        # composite covers both, leftmost column replaces the single index.
        Index("ix_ai_messages_conversation_id_created_at", "conversation_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai_conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String, nullable=False)
    content_text: Mapped[str] = mapped_column(Text, nullable=False)
    raw_parts_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
