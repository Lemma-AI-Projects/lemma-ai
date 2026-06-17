import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import Boolean, ForeignKey, Index, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class ChapterVideoCandidate(Base):
    """The search funnel: every video found for a chapter, with the pick flagged.

    Keeping the full top-N (not just the chosen one) lets a later "换个老师讲"
    reuse the pool without re-searching. raw_json holds the provider's untouched
    item — the boundary stays inside the row and never leaks through the API.
    """

    __tablename__ = "chapter_video_candidates"
    # Funnel reads always ask "candidates for this chapter".
    __table_args__ = (
        Index("ix_chapter_video_candidates_chapter_id", "chapter_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    chapter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_chapters.id", ondelete="CASCADE"),
        nullable=False,
    )
    platform: Mapped[str] = mapped_column(String, nullable=False)
    platform_video_id: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    author: Mapped[str | None] = mapped_column(String, nullable=True)
    duration_s: Mapped[int | None] = mapped_column(Integer, nullable=True)
    view_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    like_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String, nullable=True)
    score: Mapped[Decimal | None] = mapped_column(Numeric, nullable=True)
    is_chosen: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    # How this candidate entered the pool (e.g. which expanded query / platform).
    discovery_source: Mapped[str] = mapped_column(String, nullable=False)
    raw_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
