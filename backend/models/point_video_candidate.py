import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class PointVideoCandidate(Base):
    """A video candidate for one learning point (the delivery-side funnel).

    compose picks videos out of the course-level pool (course_search_candidates)
    and materializes the chosen one here, with is_chosen=True, so the delivery
    chain (download -> Storage -> Gemini) has a stable per-point row to hang
    assets off. Kept separate from the pool on purpose: the pool is pre-structure
    and keyed by course_id, this is keyed by point_id and is what playback reads.

    raw_json keeps the provider's untouched item so the boundary stays inside
    the row.
    """

    __tablename__ = "point_video_candidates"
    # Funnel reads always ask "candidates for this point".
    __table_args__ = (
        Index("ix_point_video_candidates_point_id", "point_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    point_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_points.id", ondelete="CASCADE"),
        nullable=False,
    )
    platform: Mapped[str] = mapped_column(String, nullable=False)
    platform_video_id: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    author: Mapped[str | None] = mapped_column(String, nullable=True)
    # Platform-native uploader id (e.g. Bilibili mid) for the author homepage
    # link; None when the platform exposes no stable id (YouTube search items).
    author_id: Mapped[str | None] = mapped_column(String, nullable=True)
    duration_s: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # BigInteger, matching course_search_candidates: a popular YouTube video
    # exceeds the ~2.1B Integer ceiling, and clamping on the way in would make
    # the two pools disagree about the same video.
    view_count: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    like_count: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
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
