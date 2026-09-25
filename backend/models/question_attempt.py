import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class QuestionSetAttempt(Base):
    """One answering session of a user on a set (拍板 D12).

    Managed implicitly by the server: the current `open` session for
    (user, set) is found or created on submit, so the frontend never sends a
    session id. batch closes it in the submitting transaction; immediate closes
    it once every question has been submitted. Redo / history (reserved) add
    new sessions next to closed ones.
    """

    __tablename__ = "question_set_attempts"
    __table_args__ = (
        CheckConstraint("status in ('open', 'submitted')", name="ck_question_set_attempts_status"),
        CheckConstraint("mode in ('batch', 'immediate')", name="ck_question_set_attempts_mode"),
        # At most one open session per learner per set.
        Index(
            "uq_question_set_attempts_user_id_set_id_open",
            "user_id",
            "question_set_id",
            unique=True,
            postgresql_where=text("status = 'open'"),
        ),
        Index(
            "ix_question_set_attempts_user_id_set_id_started_at",
            "user_id",
            "question_set_id",
            "started_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    question_set_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("question_sets.id", ondelete="CASCADE"), nullable=False
    )
    mode: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    submitted_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )


class QuestionAttempt(Base):
    """A graded submission of one question inside a session, with the grading
    snapshot (slot_results_json) so history never depends on re-grading."""

    __tablename__ = "question_attempts"
    __table_args__ = (
        CheckConstraint(
            "status in ('graded', 'ungradable', 'pending')", name="ck_question_attempts_status"
        ),
        UniqueConstraint(
            "attempt_session_id",
            "question_version_id",
            name="uq_question_attempts_session_id_version_id",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    attempt_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("question_set_attempts.id", ondelete="CASCADE"),
        nullable=False,
    )
    question_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("question_versions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    responses_json: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    slot_results_json: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    score_earned: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False)
    client_submitted_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    submitted_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    graded_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
