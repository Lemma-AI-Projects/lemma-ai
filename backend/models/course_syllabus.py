import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base

# The syllabus tree (课表): chapter -> unit -> lesson. Only
# services/course_library reads or writes these tables.
#
# Every "parent" link is a composite FK that includes course_id, so the
# database itself keeps a unit under a chapter of the same course and a lesson
# under a unit of the same course. A composite FK must target a unique key,
# hence the (course_id, id) unique constraints. Deleting a course cascades
# chapter -> unit -> lesson.


class CourseChapter(Base):
    """章节."""

    __tablename__ = "course_chapters"
    __table_args__ = (
        CheckConstraint("name <> ''", name="ck_course_chapters_name_not_empty"),
        UniqueConstraint(
            "course_id", "order_index", name="uq_course_chapters_course_id_order_index"
        ),
        UniqueConstraint("course_id", "id", name="uq_course_chapters_course_id_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )


class CourseUnit(Base):
    """单元. No separate FK to courses: the composite FK to the chapter already
    guarantees the course exists."""

    __tablename__ = "course_units"
    __table_args__ = (
        ForeignKeyConstraint(
            ["course_id", "chapter_id"],
            ["course_chapters.course_id", "course_chapters.id"],
            ondelete="CASCADE",
            name="fk_course_units_course_id_chapter_id",
        ),
        CheckConstraint("name <> ''", name="ck_course_units_name_not_empty"),
        UniqueConstraint(
            "chapter_id", "order_index", name="uq_course_units_chapter_id_order_index"
        ),
        UniqueConstraint("course_id", "id", name="uq_course_units_course_id_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    course_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    chapter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )


class CourseLesson(Base):
    """课. Other systems point at a lesson by (course_id, id); the lesson
    number (第几课) is derived and never stored."""

    __tablename__ = "course_lessons"
    __table_args__ = (
        ForeignKeyConstraint(
            ["course_id", "unit_id"],
            ["course_units.course_id", "course_units.id"],
            ondelete="CASCADE",
            name="fk_course_lessons_course_id_unit_id",
        ),
        CheckConstraint("title <> ''", name="ck_course_lessons_title_not_empty"),
        CheckConstraint("goal <> ''", name="ck_course_lessons_goal_not_empty"),
        UniqueConstraint(
            "unit_id", "order_index", name="uq_course_lessons_unit_id_order_index"
        ),
        UniqueConstraint("course_id", "id", name="uq_course_lessons_course_id_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    course_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    unit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    goal: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
