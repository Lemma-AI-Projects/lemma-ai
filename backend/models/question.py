import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class Question(Base):
    """A question exactly as the provider returned it (拉到即保存).

    XKW has no "get question by id" endpoint, and answers only arrive with the
    fetch, so this local copy is the sole basis for grading, versioning,
    re-parsing, auditing and content feedback. Global content, shared across
    users (拍板 D14: kept permanently, one copy per external id) and never
    exposed directly — it is reachable only through a question set you own.
    """

    __tablename__ = "questions"
    __table_args__ = (
        UniqueConstraint("provider", "external_id", name="uq_questions_provider_external_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    provider: Mapped[str] = mapped_column(String, nullable=False)
    external_id: Mapped[str] = mapped_column(String, nullable=False)
    # premium | massive | paper | other (massive can never be structured).
    source_kind: Mapped[str] = mapped_column(String, nullable=False)
    # XKW course = 学段×学科, unrelated to Lemma courses.
    xkw_course_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    type_id: Mapped[str | None] = mapped_column(String, nullable=True)
    type_name: Mapped[str | None] = mapped_column(String, nullable=True)
    # From the per-course type dictionary (基础数据API/19); null = unknown.
    objective: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    difficulty: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), nullable=True)
    difficulty_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    answer_scoreable: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    # 0 none / 1 audio / 2 solution video / 3 both (04 L94).
    media_flag: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stem_html: Mapped[str] = mapped_column(Text, nullable=False)
    answer_html: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    explanation_html: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    # kpoints / catalogs / tags / years / source_papers / extra, untouched.
    meta_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    # sha256 of the three HTML fields: a change means XKW corrected the content.
    raw_hash: Mapped[str] = mapped_column(String, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class QuestionVersion(Base):
    """One parse of one question: the answer view, the (secret) review and the
    grader's slot map, pinned by content_version = parser_version + raw hash.

    Versions are never rewritten: a parser upgrade or corrected content adds a
    new row and moves `is_current`; sets and attempts keep pointing at the
    version they were built / answered against.

    review_json holds reference answers and explanations (拍板 D3: same row,
    separate column). Answer-view queries must select view columns only.
    """

    __tablename__ = "question_versions"
    __table_args__ = (
        CheckConstraint("structure in ('parsed', 'raw')", name="ck_question_versions_structure"),
        CheckConstraint(
            "parse_status in ('parsed', 'raw', 'failed')",
            name="ck_question_versions_parse_status",
        ),
        UniqueConstraint(
            "question_id", "content_version", name="uq_question_versions_question_id_content_version"
        ),
        Index("ix_question_versions_question_id_is_current", "question_id", "is_current"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    parser_version: Mapped[int] = mapped_column(Integer, nullable=False)
    content_version: Mapped[str] = mapped_column(String, nullable=False)
    structure: Mapped[str] = mapped_column(String, nullable=False)
    view_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    review_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    slot_map_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    parse_status: Mapped[str] = mapped_column(String, nullable=False)
    degraded_slot_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    # True when every slot is machine-gradable (the dev set-picking rule).
    fully_auto: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
