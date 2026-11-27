import uuid
from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, func
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class ScheduleOverdueRecord(Base):
    """处理记录: the last day overdue tasks were fully processed for a user.

    Owned by the schedule rules layer (services/schedule). Written only when
    every source's replan succeeded that day, in the same transaction as the
    task changes it covers.
    """

    __tablename__ = "schedule_overdue_records"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        primary_key=True,
    )
    last_processed_on: Mapped[date] = mapped_column(Date, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
