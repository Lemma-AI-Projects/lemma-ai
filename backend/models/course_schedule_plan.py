import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, ForeignKey, SmallInteger, String, func
from sqlalchemy.dialects.postgresql import ARRAY, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class CourseSchedulePlan(Base):
    """排期计划: the schedule a user chose for one course, at most one per
    course. Only services/course_scheduling reads or writes this table; the
    schedule book does not know it exists.

    start_date / end_date are filled when the course is placed into the
    schedule. "Deadline later than today" is checked by the course builder at
    step 1, not here (it depends on the day the check runs).
    """

    __tablename__ = "course_schedule_plans"
    __table_args__ = (
        # 0 = Monday ... 6 = Sunday (same as the frontend and date.weekday()).
        # Duplicates are refused by the input type, not by this constraint.
        CheckConstraint(
            "cardinality(study_weekdays) between 1 and 7 "
            "and study_weekdays <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[]",
            name="ck_course_schedule_plans_study_weekdays",
        ),
        CheckConstraint(
            "period in ('unlimited', 'two_weeks', 'one_month', 'until_date')",
            name="ck_course_schedule_plans_period",
        ),
        CheckConstraint(
            "(period = 'until_date') = (deadline is not null)",
            name="ck_course_schedule_plans_deadline",
        ),
        CheckConstraint(
            "end_date is null or start_date is not null",
            name="ck_course_schedule_plans_end_date",
        ),
    )

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    study_weekdays: Mapped[list[int]] = mapped_column(
        ARRAY(SmallInteger), nullable=False
    )
    period: Mapped[str] = mapped_column(String, nullable=False)
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # NULL when the period is unlimited.
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
