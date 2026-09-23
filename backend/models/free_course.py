"""The free-course tree and its two accumulating tables.

**Why `course_units` / `course_chapters` are here and not in models/course.py.**
main-v3's `c3f1a9b2d5e7_course_four_level_rebuild` rebuilt the course domain as
`course_modules -> course_lessons -> course_points` and dropped
`course_units` / `course_chapters` in the same migration; `e6f1a3c8b2d7` then
dropped `courses.mode`. That was right for the video pipeline, which now models
a lesson as a bag of points, each bound to one real video.

Free Course is a *different* pipeline and needs a different shape: a lesson has
learning objectives and structured content objects (explanation / example /
practice / assessment), not a video. It was written against units -> chapters,
and it is being brought to this branch whole rather than re-modelled onto points
(a point is a video; it has nowhere to put an explanation).

So the two trees coexist under one `courses` table, told apart by `courses.mode`:

    mode = 'video'  ->  modules -> lessons -> points (+ video delivery tables)
    mode = 'free'   ->  units   -> chapters -> lesson objects

Anything that walks "the course tree" must branch on `mode` first. The unit and
chapter tables therefore live in this file, next to the objects they hold, and
NOT in models/course.py — the video model has no reason to know about them.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
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


class CourseUnit(Base):
    """A section of a free course (chapter in the learner's words)."""

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
    """One lesson of a free course: an objective, a blueprint, and objects.

    Deliberately WITHOUT the two columns the video pipeline used to keep here
    (`chosen_candidate_id`, and `progress` as a video-watch counter): this table
    now exists only for free courses, and a column nothing writes is a lie about
    what the schema means. The learner's answers live in
    `course_lesson_observations`, keyed by object.
    """

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
    # The lesson's learning objective (a node attribute of the map).
    objective: Mapped[str | None] = mapped_column(Text, nullable=True)
    # The generated LessonBlueprint for this lesson (objective / prerequisites /
    # sequence), kept for confirm / edit / regenerate and for audit.
    blueprint_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True
    )
    status: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )


class CourseLessonObject(Base):
    """One structured piece of a lesson (explanation/example/practice/assessment).

    Interactive payload (options / answer / expected / hint) lives in JSONB; the
    correct option id and expected answer are server-side facts and never leave
    through the read schema.
    """

    __tablename__ = "course_lesson_objects"
    __table_args__ = (
        Index(
            "ix_course_lesson_objects_chapter_order", "chapter_id", "order_index"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    chapter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_chapters.id", ondelete="CASCADE"),
        nullable=False,
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    concept: Mapped[str | None] = mapped_column(String, nullable=True)
    difficulty: Mapped[str] = mapped_column(
        String, nullable=False, server_default="core"
    )
    payload_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )


class CourseLessonObservation(Base):
    """One learner answer to one lesson object (the interaction product).

    `verdict` is the authority: for objective items the service decides it locally
    (拍板 5) and the LLM only explains; for open items the LLM decides.
    `response_json` keeps the raw submission so the learner-state work can re-read
    it later.
    """

    __tablename__ = "course_lesson_observations"
    __table_args__ = (
        Index("ix_course_lesson_observations_object_id", "object_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    object_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_lesson_objects.id", ondelete="CASCADE"),
        nullable=False,
    )
    kind: Mapped[str] = mapped_column(String, nullable=False, server_default="answer")
    response_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    verdict: Mapped[str | None] = mapped_column(String, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
