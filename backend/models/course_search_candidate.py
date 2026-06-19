import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class CourseSearchCandidate(Base):
    """Course-level broad-search pool (搜索前置).

    Every video the request-level broad search found, cached BEFORE any outline
    exists. compose reads this pool (rank + trim) to select + organize; the
    chosen subset is then materialized into chapter_video_candidates, so the
    video-delivery path stays unchanged.

    Kept separate from chapter_video_candidates on purpose: that one is the
    per-chapter funnel keyed by chapter_id; this is the pre-structure pool keyed
    by course_id. Rich engagement fields (comment_count / tags / metrics) live
    here for selection and never need to reach the delivery table. raw_json keeps
    the provider's untouched item (boundary stays inside the row).
    """

    __tablename__ = "course_search_candidates"
    __table_args__ = (
        # The only read is "the pool for this course".
        Index("ix_course_search_candidates_course_id", "course_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    platform: Mapped[str] = mapped_column(String, nullable=False)
    platform_video_id: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    author: Mapped[str | None] = mapped_column(String, nullable=True)
    author_id: Mapped[str | None] = mapped_column(String, nullable=True)
    duration_s: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # BigInteger: popular YouTube videos exceed the ~2.1B Integer ceiling.
    view_count: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    like_count: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    comment_count: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    thumbnail_url: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Neutral rich signals for selection; platform-specific extras live in metrics.
    tags: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    metrics: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    raw_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
