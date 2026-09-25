import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class QuestionSet(Base):
    """A user-owned set of questions to answer (quiz / practice / ...).

    Lifecycle: generating -> ready | empty | failed. Built asynchronously by
    tasks/question_set_build.py from `query_spec_json`; never hangs in
    generating (bounded retries end in failed). `empty` means XKW had too few
    usable questions for the spec.

    First phase only knows the developer entry (`origin_kind='dev'`); course
    / conversation origins arrive later as extra nullable columns + CHECK values.
    """

    __tablename__ = "question_sets"
    __table_args__ = (
        CheckConstraint(
            "kind in ('quiz', 'assignment', 'practice', 'paper')", name="ck_question_sets_kind"
        ),
        CheckConstraint("mode in ('batch', 'immediate')", name="ck_question_sets_mode"),
        CheckConstraint(
            "status in ('generating', 'ready', 'empty', 'failed')", name="ck_question_sets_status"
        ),
        CheckConstraint("origin_kind in ('dev')", name="ck_question_sets_origin_kind"),
        Index("ix_question_sets_user_id_updated_at", "user_id", "updated_at"),
        # Empty-result cache: "same spec came back empty in the last 24h".
        Index("ix_question_sets_spec_hash_created_at", "spec_hash", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String, nullable=False)
    mode: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    origin_kind: Mapped[str] = mapped_column(String, nullable=False)
    query_spec_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    spec_hash: Mapped[str] = mapped_column(String, nullable=False)
    error_type: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    items: Mapped[list["QuestionSetItem"]] = relationship(
        order_by="QuestionSetItem.order_index", passive_deletes=True
    )


class QuestionSetItem(Base):
    """A set's question, pinned to the exact version it was built with.
    RESTRICT: a version referenced by a set can never disappear under it."""

    __tablename__ = "question_set_items"
    __table_args__ = (
        UniqueConstraint(
            "question_set_id", "order_index", name="uq_question_set_items_set_id_order_index"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    question_set_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("question_sets.id", ondelete="CASCADE"), nullable=False
    )
    question_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("question_versions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
