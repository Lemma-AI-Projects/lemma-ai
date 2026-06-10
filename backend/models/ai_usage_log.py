import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import Boolean, Index, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class AiUsageLog(Base):
    """Append-only ledger: one row per AI call attempt (终稿 6.2 full field list).

    Failures and interrupted streams are rows too — they cost money. Rows for
    one logical request share a trace_id (fallback_attempt orders them).
    """

    __tablename__ = "ai_usage_logs"
    # Quota checks and cost reports always ask "this user, this time window";
    # the composite index serves that and plain user_id lookups (leftmost
    # column), so there is no separate user_id index.
    __table_args__ = (
        Index("ix_ai_usage_logs_user_id_created_at", "user_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    use_case: Mapped[str] = mapped_column(String, nullable=False)
    platform: Mapped[str] = mapped_column(String, nullable=False)
    adapter: Mapped[str] = mapped_column(String, nullable=False)
    route_model: Mapped[str] = mapped_column(String, nullable=False)
    actual_model: Mapped[str | None] = mapped_column(String, nullable=True)

    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    raw_usage: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    # Money the platform itself reported for this call. OpenRouter returns it
    # per response; AiHubMix doesn't -> NULL (estimate from tokens instead).
    # Never a guess: NULL means "platform sent no figure".
    cost_usd: Mapped[Decimal | None] = mapped_column(Numeric(12, 8), nullable=True)

    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    request_id: Mapped[str | None] = mapped_column(String, nullable=True)
    trace_id: Mapped[str] = mapped_column(String, nullable=False, index=True)

    fallback_attempt: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    error_type: Mapped[str | None] = mapped_column(String, nullable=True)
    usage_missing: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )

    # Intentionally no FK: the ledger must outlive account deletions.
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    # Same no-FK policy: links spend to a conversation while it exists, stays
    # meaningful in aggregates after the conversation is deleted.
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
