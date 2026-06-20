import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class ChapterGeminiFile(Base):
    """Cached Gemini Files API reference for a chapter's re-hosted video (AI 伴学).

    One row per chapter (1:1). The companion feeds the chapter video to Gemini
    video understanding by `file_uri`; the Files API cannot LIST and files
    auto-expire ~48h, so this row is the ONLY ledger of what was uploaded and
    when it dies — `expires_at` must be checked before every reuse. Kept separate
    from chapter_video_assets on purpose: different lifecycle clocks (the
    provider's ~48h file expiry here vs the asset's 30-day sliding storage
    expiry there).

    candidate_id pins WHICH chosen candidate was uploaded: a re-pick
    (chapter.chosen_candidate_id changes) makes the file stale and it re-uploads.
    status is a small claim/mark machine (pending -> uploading -> ready/failed)
    so two ingests never race the same chapter (mirrors chapter_video_assets).
    """

    __tablename__ = "chapter_gemini_files"
    __table_args__ = (
        CheckConstraint(
            "status in ('pending', 'uploading', 'ready', 'failed')",
            name="ck_chapter_gemini_files_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # 1:1 with chapter — UNIQUE so a chapter never accumulates two file rows.
    chapter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_chapters.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    # Which chosen candidate this file was uploaded from; a re-pick makes it
    # stale. CASCADE so deleting the candidate clears the cache too. Nullable so
    # a pending row can exist before the candidate is pinned.
    candidate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chapter_video_candidates.id", ondelete="CASCADE"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(String, nullable=False)
    # genai File.name (platform-private id) and File.uri (passed to Part.from_uri).
    file_id: Mapped[str | None] = mapped_column(String, nullable=True)
    file_uri: Mapped[str | None] = mapped_column(String, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String, nullable=True)
    # Provider expiration (~48h). Reuse only while now < expires_at - margin.
    expires_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
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
