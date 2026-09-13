"""Free-Course tables: the two things that genuinely accumulate.

spec §15: the map and the path are NOT tables (they live in the courses/
course_units/course_chapters tree, derived on read). Rows of their own exist only
for a lesson's structured content objects and for the learner's observations —
every answer becomes an observation, which is the read-back surface for a future
learner-state provider.

Wall shapes cross here one-for-one with ai/free_course/types (LearningObject,
Observation). `id` is app-generated (same convention as models/course.py); the
DB only owns ordering and integrity.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


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
    """One learner answer to one lesson object (the interaction product, spec §8).

    `verdict` is the authority: for objective items the service decides it locally
    (拍板 5) and the LLM only explains; for open items the LLM decides. `response_json`
    keeps the raw submission so a future learner-state provider can re-read it.
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