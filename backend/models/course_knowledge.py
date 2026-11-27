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


class CourseKnowledgePoint(Base):
    """知识点. Only services/course_library reads or writes this table.

    The id is a hash of (course id + name) truncated to the configured length
    (services/product_params.py), so it is unique only within one course and
    the primary key is (course_id, id). Other systems point here with
    "course id + point id". The column has no length limit so changing the
    digit count needs no migration.

    Position (位置) — which lesson and in what order — lives on this row, so a
    point can never sit in two lessons. The composite FK keeps that lesson in
    the same course; NULL lesson_id ("no position yet") is not checked (MATCH
    SIMPLE). The FK has no ON DELETE action on purpose: SET NULL would also
    null course_id, which is part of the primary key. Rewriting the syllabus
    or the map clears positions before deleting lessons.
    """

    __tablename__ = "course_knowledge_points"
    __table_args__ = (
        ForeignKeyConstraint(
            ["course_id", "lesson_id"],
            ["course_lessons.course_id", "course_lessons.id"],
            name="fk_course_knowledge_points_course_id_lesson_id",
        ),
        CheckConstraint("name <> ''", name="ck_course_knowledge_points_name_not_empty"),
        CheckConstraint(
            "(lesson_id is null) = (order_index is null)",
            name="ck_course_knowledge_points_position",
        ),
        UniqueConstraint(
            "course_id", "name", name="uq_course_knowledge_points_course_id_name"
        ),
        UniqueConstraint(
            "lesson_id",
            "order_index",
            name="uq_course_knowledge_points_lesson_id_order_index",
        ),
    )

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        primary_key=True,
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    lesson_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    order_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )


class CourseKnowledgeEdge(Base):
    """连线: learning `after` requires knowing `before` (先 -> 后).

    Both composite FKs point into the same course's points, so an edge can
    never reach into another course. Self-loops are refused here; cycles are
    checked by the library's write action.
    """

    __tablename__ = "course_knowledge_edges"
    __table_args__ = (
        ForeignKeyConstraint(
            ["course_id", "before_id"],
            ["course_knowledge_points.course_id", "course_knowledge_points.id"],
            ondelete="CASCADE",
            name="fk_course_knowledge_edges_course_id_before_id",
        ),
        ForeignKeyConstraint(
            ["course_id", "after_id"],
            ["course_knowledge_points.course_id", "course_knowledge_points.id"],
            ondelete="CASCADE",
            name="fk_course_knowledge_edges_course_id_after_id",
        ),
        CheckConstraint("before_id <> after_id", name="ck_course_knowledge_edges_no_self_loop"),
    )

    course_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    before_id: Mapped[str] = mapped_column(String, primary_key=True)
    after_id: Mapped[str] = mapped_column(String, primary_key=True)
