"""Audit trail for dev-dashboard component control (who did what, when)."""

import uuid
from datetime import datetime

from sqlalchemy import Index, String, Text, func
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class DevAuditLog(Base):
    """Append-only log of dev actions (e.g. component:redis:stop)."""

    __tablename__ = "dev_audit_logs"
    __table_args__ = (Index("ix_dev_audit_logs_created_at", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    actor: Mapped[str] = mapped_column(String(64), nullable=False)
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
