"""The teaching session's own row: one learner, one chapter, one run through.

Why this is a table and not just a request/response: the session is a *machine*
that stops and waits for the learner. "Stop" has to be able to abandon the beat
that is playing, "I don't understand" has to know what was already said, and a
refresh must not restart the lecture. None of that survives if the state lives
only in the browser tab.

The plan and the transcript are JSONB rather than normalized tables on purpose:
a step is a teaching beat, not an entity anything queries by — nobody will ever
join on "the third sentence of step 2". Normalizing would buy nothing and cost
a migration per prompt change.

`chapter_id` cascades: a session is not a record of achievement (that would be
Learner State, deliberately elsewhere) — it is the current run of one lesson.
Deleting the lesson deletes it.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class FreeCourseSession(Base):
    """One teaching session over one chapter.

    `cursor` is where the learner got to: the index of the next step to play.
    Steps live in `plan_json["steps"]` and grow over the session (every re-teach
    or interrupt reply appends), so the transcript can be replayed in order and
    the digest sent back to the model is exactly what was taught.

    `status` is "active" until the learner finishes or walks away; a new session
    on the same chapter supersedes the old one rather than resuming it, because
    "start learning again" is what the button says.
    """

    __tablename__ = "free_course_sessions"
    __table_args__ = (
        Index("ix_free_course_sessions_chapter_id", "chapter_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    chapter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_chapters.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String, nullable=False, server_default="active"
    )
    cursor: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    # {"title": str, "objective": str, "steps": [...]} — the whole teaching plan.
    plan_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    # [{"stepId", "signal", "input", "optionId", "verdict", "feedback"}]
    transcript_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, server_default="[]"
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
