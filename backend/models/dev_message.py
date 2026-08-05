"""Dev dashboard message board rows (ceaser <-> syk handover notes)."""

import uuid
from datetime import datetime

from sqlalchemy import Index, String, Text, func
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class DevMessage(Base):
    """Developer-to-developer notes; author is the dev username."""

    __tablename__ = "dev_messages"
    __table_args__ = (Index("ix_dev_messages_created_at", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    author: Mapped[str] = mapped_column(String(64), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
