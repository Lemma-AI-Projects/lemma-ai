import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class Course(Base):
    """A generated course and its lifecycle.

    状态机 (物料化门禁): intake -> organizing -> materializing -> ready, failed
    on error. compose lands the outline as `materializing` (not enterable); a
    chord then pre-generates every chapter's video + overview and only flips
    `ready` once ALL chapters are ready (strict gate). A parallel `search_status`
    (searching -> searched | failed) tracks the broad search that runs
    concurrently with the questionnaire; organize gates on its terminal value
    (握手协议 C2). `outline_ready`/`building` are retired but kept in the
    constraint for historical rows / backward compat.

    A course is optionally born inside a conversation (conversation_id, SET NULL
    so deleting the chat never deletes the course). Courses below `ready` are
    hidden from the course list (拍板) and swept later by a cleanup job.
    """

    __tablename__ = "courses"
    __table_args__ = (
        CheckConstraint(
            "status in ('intake', 'outline_ready', 'organizing', 'building', "
            "'materializing', 'ready', 'failed')",
            name="ck_courses_status",
        ),
        CheckConstraint(
            "search_status in ('searching', 'searched', 'failed')",
            name="ck_courses_search_status",
        ),
        # Course list is WHERE user_id ORDER BY updated_at DESC; the composite
        # serves filter + order in one pass and (leftmost column) covers plain
        # user_id lookups, so no separate single-column index.
        Index("ix_courses_user_id_updated_at", "user_id", "updated_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    # The conversation the course was born in (拍板). SET NULL: deleting the
    # chat must never cascade into the course.
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai_conversations.id", ondelete="SET NULL"),
        nullable=True,
    )
    topic: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    # Broad-search sub-state, independent of `status` and only meaningful during
    # intake/organizing: searching -> searched | failed. organize gates on its
    # terminal value (握手协议 C2). Defaults to searching: a course is born with
    # its broad search already kicked off.
    search_status: Mapped[str] = mapped_column(
        String, nullable=False, server_default="searching"
    )
    # Questionnaire + answers + derived profile, kept together as one JSON blob
    # (阶段一 product data, never queried by column).
    intake_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Read-only navigation for the snapshot schema (CourseDetailOut). DB ON
    # DELETE CASCADE is the authoritative delete path; passive_deletes keeps the
    # ORM from loading and NULLing children itself (same DB-driven cascade the
    # ai_conversations/ai_messages pair relies on).
    units: Mapped[list["CourseUnit"]] = relationship(
        order_by="CourseUnit.order_index",
        passive_deletes=True,
    )


class CourseUnit(Base):
    __tablename__ = "course_units"
    # Outline render reads WHERE course_id ORDER BY order_index; the composite
    # covers both and (leftmost column) plain course_id lookups.
    __table_args__ = (
        Index("ix_course_units_course_id_order_index", "course_id", "order_index"),
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
    title: Mapped[str] = mapped_column(String, nullable=False)
    overview: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    chapters: Mapped[list["CourseChapter"]] = relationship(
        order_by="CourseChapter.order_index",
        passive_deletes=True,
    )


class CourseChapter(Base):
    __tablename__ = "course_chapters"
    __table_args__ = (
        CheckConstraint(
            "status in ('not_started', 'researching', 'ready', 'failed')",
            name="ck_course_chapters_status",
        ),
        # Outline render reads WHERE unit_id ORDER BY order_index.
        Index("ix_course_chapters_unit_id_order_index", "unit_id", "order_index"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_units.id", ondelete="CASCADE"),
        nullable=False,
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False)
    progress: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    # The picked candidate. Deliberately NOT a FK: candidates already point at
    # chapters (CASCADE), and a reverse FK would form a dependency cycle; the
    # service keeps this id valid (说明: 业务层保证).
    chosen_candidate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
