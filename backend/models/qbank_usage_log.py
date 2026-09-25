import uuid
from datetime import datetime

from sqlalchemy import Boolean, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class QbankUsageLog(Base):
    """Append-only ledger: one row per XKW (学科网) call attempt.

    Kept apart from provider_usage_logs (拍板 D2): XKW bills per call, not per
    actor run, and the daily quota is aggregated from this table. Failures are
    rows too; `billable` is False for 900161214 (success but empty) and for
    fixture-provider calls. No FKs (same policy as the other ledgers): rows must
    outlive users and question sets.
    """

    __tablename__ = "qbank_usage_logs"
    __table_args__ = (
        Index("ix_qbank_usage_logs_created_at", "created_at"),
        Index("ix_qbank_usage_logs_user_id_created_at", "user_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    provider: Mapped[str] = mapped_column(String, nullable=False)
    endpoint: Mapped[str] = mapped_column(String, nullable=False)
    use_case: Mapped[str] = mapped_column(String, nullable=False)
    http_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    raw_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    billable: Mapped[bool] = mapped_column(Boolean, nullable=False)
    result_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    error_type: Mapped[str | None] = mapped_column(String, nullable=True)
    request_id: Mapped[str | None] = mapped_column(String, nullable=True)
    trace_id: Mapped[str] = mapped_column(String, nullable=False)
    session_id: Mapped[str | None] = mapped_column(String, nullable=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    question_set_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
