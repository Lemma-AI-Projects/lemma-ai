import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class CoursePointProgress(Base):
    """一个学习者在一个学习点上的学习进度。

    This is LEARNING progress and must never be conflated with
    CoursePoint.build_status (generation pipeline). A row appears the first time
    the learner plays the point; `completed_at` stays null until the video is
    watched past the completion threshold, and once set it is never cleared —
    re-watching a point cannot un-complete it.

    Course / module / lesson percentages are always DERIVED from these rows at
    read time. Nothing is denormalised: the course tree can be rebuilt, and any
    stored rollup would silently drift from the points it summarises.
    """

    __tablename__ = "course_point_progress"
    __table_args__ = (
        CheckConstraint(
            "last_position_seconds >= 0",
            name="ck_course_point_progress_last_position_seconds",
        ),
        CheckConstraint(
            "duration_seconds is null or duration_seconds > 0",
            name="ck_course_point_progress_duration_seconds",
        ),
        # One row per learner per point — also the upsert's conflict target.
        UniqueConstraint(
            "user_id", "point_id", name="uq_course_point_progress_user_id_point_id"
        ),
        # 周进度卡 reads WHERE user_id AND completed_at IN (week range).
        Index(
            "ix_course_point_progress_user_id_completed_at",
            "user_id",
            "completed_at",
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
    point_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_points.id", ondelete="CASCADE"),
        nullable=False,
    )
    # Resume position, in whole seconds (sub-second precision buys nothing for
    # a resume affordance and keeps the upsert payload integral).
    last_position_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    # The video's length as reported by the player. Null when the player never
    # reported one, which is exactly when the completion ratio is uncomputable.
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Null = not finished. Set once, monotonically.
    completed_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
