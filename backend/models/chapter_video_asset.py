import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class ChapterVideoAsset(Base):
    """The re-hosted, playable copy of a chapter's chosen video (就近预热 + 懒加载兜底).

    One row per chapter (1:1). Kept separate from chapter_video_candidates (the
    search funnel) on purpose: this tracks the DOWNLOAD/STORAGE lifecycle — a
    small state machine (pending -> downloading -> ready/failed) plus a
    sliding-expiry clock — so re-download, cleanup and future reuse (e.g. feeding
    the file to AI video understanding) all hang off one record without polluting
    the funnel or the chapter outline.

    candidate_id pins WHICH chosen candidate was downloaded: when a chapter is
    re-picked (chapter.chosen_candidate_id changes) the asset turns stale and is
    re-downloaded. storage_path is the object key inside the private bucket; the
    same key core/storage signs for playback (S3 writes it, REST signs it — one
    underlying object).
    """

    __tablename__ = "chapter_video_assets"
    __table_args__ = (
        CheckConstraint(
            "status in ('pending', 'downloading', 'ready', 'failed')",
            name="ck_chapter_video_assets_status",
        ),
        # Cleanup sweep is WHERE last_accessed_at < cutoff (sliding expiry).
        Index(
            "ix_chapter_video_assets_last_accessed_at", "last_accessed_at"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # 1:1 with chapter — UNIQUE so a chapter never accumulates two assets.
    chapter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_chapters.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    # Which chosen candidate this asset was downloaded from; a re-pick makes it
    # stale. CASCADE so deleting the candidate clears the asset too. Nullable so a
    # pending row can exist before the candidate is resolved.
    candidate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chapter_video_candidates.id", ondelete="CASCADE"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(String, nullable=False)
    storage_bucket: Mapped[str | None] = mapped_column(String, nullable=True)
    # Object key within the bucket; set on a successful upload (ready).
    storage_path: Mapped[str | None] = mapped_column(String, nullable=True)
    # Final backend that produced the local mp4, e.g. bbdown or ytdlp-fallback.
    download_backend: Mapped[str | None] = mapped_column(String, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String, nullable=True)
    # BigInteger: a single lecture can exceed the ~2 GB Integer ceiling.
    size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    duration_s: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_type: Mapped[str | None] = mapped_column(String, nullable=True)
    downloaded_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    # Sliding-expiry truth: bumped on playback fetch; cleanup compares to it.
    last_accessed_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
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
