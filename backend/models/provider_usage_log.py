import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class ProviderUsageLog(Base):
    """Append-only ledger for external search-provider calls (Apify et al.).

    Kept separate from ai_usage_logs on purpose: that one is token-priced LLM
    spend, this one is per-actor / per-result search spend. Failures are rows
    too — an Apify run costs money even when it returns nothing. No FK (same
    policy as ai_usage_logs): the ledger must outlive course/account deletion
    and stay meaningful in aggregates.
    """

    __tablename__ = "provider_usage_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    provider: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "apify"
    # Nullable: Apify carries a real actor id; free self-built providers
    # (ytdlp/bili) have no actor and record NULL.
    actor_id: Mapped[str | None] = mapped_column(String, nullable=True)
    platform: Mapped[str] = mapped_column(String, nullable=False)
    use_case: Mapped[str] = mapped_column(String, nullable=False)
    run_id: Mapped[str | None] = mapped_column(String, nullable=True)
    result_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cost_usd: Mapped[Decimal | None] = mapped_column(Numeric(12, 8), nullable=True)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    error_type: Mapped[str | None] = mapped_column(String, nullable=True)
    # Intentionally no FK: links spend to a course while it exists, stays
    # meaningful after the course is deleted.
    course_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    trace_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
