import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class ScheduleTask(Base):
    """One task in the schedule book (日程本：任务). Only
    services/schedule reads or writes this table.

    The schedule book does not know courses: (source_kind, source_id, item_ref)
    are opaque strings owned by whoever placed the task, so there is
    deliberately no FK to any course table and no CHECK on source_kind (new
    sources need no migration). Tasks of a deleted course are withdrawn by its
    source in the same transaction as the deletion; tasks go away with the
    account through the profiles FK.

    Status (完成 / 过期 / 待办) and load are derived on read, never stored.
    """

    __tablename__ = "schedule_tasks"
    __table_args__ = (
        CheckConstraint("weight > 0", name="ck_schedule_tasks_weight_positive"),
        CheckConstraint(
            "overdue_policy in ('replan_by_source')",
            name="ck_schedule_tasks_overdue_policy",
        ),
        CheckConstraint(
            "progress >= 0 and progress <= 1", name="ck_schedule_tasks_progress_range"
        ),
        CheckConstraint(
            "(completed_at is not null) = (progress >= 1)",
            name="ck_schedule_tasks_completed",
        ),
        # At most one task per item of one source.
        UniqueConstraint(
            "source_kind",
            "source_id",
            "item_ref",
            name="uq_schedule_tasks_source_kind_source_id_item_ref",
        ),
        # Day-range reads: WHERE user_id AND planned_date BETWEEN ...
        Index("ix_schedule_tasks_user_id_planned_date", "user_id", "planned_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_kind: Mapped[str] = mapped_column(String, nullable=False)
    source_id: Mapped[str] = mapped_column(String, nullable=False)
    item_ref: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    weight: Mapped[int] = mapped_column(Integer, nullable=False)
    # Order within one source; NULL for tasks that have no order.
    sequence: Mapped[int | None] = mapped_column(Integer, nullable=True)
    planned_date: Mapped[date] = mapped_column(Date, nullable=False)
    # Planned date at first placement; never changed by moves.
    original_planned_date: Mapped[date] = mapped_column(Date, nullable=False)
    overdue_policy: Mapped[str] = mapped_column(String, nullable=False)
    progress: Mapped[float] = mapped_column(Float, nullable=False, server_default="0")
    completed_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    # 放入于.
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
