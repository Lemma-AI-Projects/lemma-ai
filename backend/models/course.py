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

    结构: course -> module（章）-> lesson（单元）-> point（学习点）, and a point
    is exactly one video. The module and lesson rows are pure structure (title +
    summary); all generation state lives on the point.

    状态机 (物料化门禁): intake -> organizing -> materializing -> ready, failed
    on error. compose lands the tree as `materializing` (not enterable); a chord
    then downloads every point's video and only flips `ready` once they are all
    ready (strict gate, with a partial-delivery fallback). A parallel
    `search_status` (searching -> searched | failed) tracks the broad search that
    runs concurrently with the questionnaire; organize gates on its terminal
    value (握手协议 C2).

    A course is optionally born inside a conversation (conversation_id, SET NULL
    so deleting the chat never deletes the course). Courses below `ready` are
    hidden from the course list (拍板) and swept later by a cleanup job.
    """

    __tablename__ = "courses"
    __table_args__ = (
        CheckConstraint(
            "status in ('intake', 'organizing', 'materializing', 'ready', "
            "'failed')",
            name="ck_courses_status",
        ),
        CheckConstraint(
            "search_status in ('searching', 'searched', 'failed')",
            name="ck_courses_search_status",
        ),
        CheckConstraint("mode in ('video', 'free')", name="ck_courses_mode"),
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
    # Course blurb shown on the dashboard and the course-center card, written by
    # compose alongside the tree.
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Display URL for the cover image. No producer yet (cover generation is a
    # separate, later capability); the dashboard renders a placeholder on null.
    cover_url: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False)
    # Broad-search sub-state, independent of `status` and only meaningful during
    # intake/organizing: searching -> searched | failed. organize gates on its
    # terminal value (握手协议 C2). Defaults to searching: a course is born with
    # its broad search already kicked off.
    search_status: Mapped[str] = mapped_column(
        String, nullable=False, server_default="searching"
    )
    # Questionnaire + answers, kept together as one JSON blob (阶段一 product
    # data, never queried by column).
    intake_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    # Which pipeline this row belongs to. Restored from main-v2: the four-level
    # rebuild assumed every course was a video course, but a free course is a
    # different tree (units -> chapters -> lesson objects) and the two MUST be
    # told apart — a free course must never open the video player, and the video
    # course center must never try to walk a free course's points.
    mode: Mapped[str] = mapped_column(
        String, nullable=False, server_default="video"
    )
    # Free-course per-course tunable projections (volume / depth / focus / pace),
    # one JSON blob. Nullable: an un-tuned course falls back to persona defaults.
    tuning_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
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
    modules: Mapped[list["CourseModule"]] = relationship(
        order_by="CourseModule.order_index",
        passive_deletes=True,
    )
    # The OTHER tree, for mode="free" rows only (see models/free_course.py for why
    # two trees coexist). Resolved by class name through the declarative
    # registry, so nothing imports CourseUnit here.
    units: Mapped[list["CourseUnit"]] = relationship(
        order_by="CourseUnit.order_index",
        passive_deletes=True,
    )


class CourseModule(Base):
    """章: the top grouping layer. Title + summary only — no state of its own
    (the dashboard derives any rollup from the points below)."""

    __tablename__ = "course_modules"
    # Dashboard render reads WHERE course_id ORDER BY order_index; the composite
    # covers both and (leftmost column) plain course_id lookups.
    __table_args__ = (
        Index("ix_course_modules_course_id_order_index", "course_id", "order_index"),
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
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    lessons: Mapped[list["CourseLesson"]] = relationship(
        order_by="CourseLesson.order_index",
        passive_deletes=True,
    )


class CourseLesson(Base):
    """单元: a handful of learning points plus a few sentences of summary."""

    __tablename__ = "course_lessons"
    __table_args__ = (
        Index("ix_course_lessons_module_id_order_index", "module_id", "order_index"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    module_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_modules.id", ondelete="CASCADE"),
        nullable=False,
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    points: Mapped[list["CoursePoint"]] = relationship(
        order_by="CoursePoint.order_index",
        passive_deletes=True,
    )


class CoursePoint(Base):
    """学习点: the leaf, bound to exactly one video.

    `build_status` is GENERATION state (not_started -> researching ->
    ready/failed), deliberately not called `status`/`progress`: the dashboard
    shows LEARNING progress, which is a different, not-yet-built concern, and
    the two must never be confused again.
    """

    __tablename__ = "course_points"
    __table_args__ = (
        CheckConstraint(
            "build_status in ('not_started', 'researching', 'ready', 'failed')",
            name="ck_course_points_build_status",
        ),
        Index("ix_course_points_lesson_id_order_index", "lesson_id", "order_index"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_lessons.id", ondelete="CASCADE"),
        nullable=False,
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    build_status: Mapped[str] = mapped_column(String, nullable=False)
    # The picked candidate. Deliberately NOT a FK: candidates already point at
    # points (CASCADE), and a reverse FK would form a dependency cycle; the
    # service keeps this id valid (说明: 业务层保证).
    chosen_candidate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
