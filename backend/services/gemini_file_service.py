"""Gemini Files API cache per chapter (AI 伴学 — the TODO(file-cache-table)).

Owns chapter_gemini_files. The companion needs the chapter's re-hosted video as
a Gemini file reference (file_uri) to "see" it; the Files API can't LIST and
files expire ~48h, so this table is the only ledger of what's uploaded and when
it dies — every reuse checks expiry. A small claim/mark machine (pending ->
uploading -> ready/failed), atomic via ON CONFLICT, stops two ingests racing the
same chapter (mirrors services/video_asset_service.py).

candidate_id pins the chosen candidate the file came from: a re-pick or an
expired file is treated as stale and re-uploaded. Expiry uses the same safety
margin as ai/media/provider_files.py (5 min).
"""

import uuid
from datetime import datetime

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ai.media import inputs, provider_files
from ai.types import VideoInput
from models.chapter_gemini_file import ChapterGeminiFile

# Keep in sync with provider_files._EXPIRY_SAFETY_MARGIN (5 minutes); inlined in
# SQL so the freshness gate is evaluated server-side.
_FRESH_PREDICATE = (
    "chapter_gemini_files.status = 'ready' "
    "AND chapter_gemini_files.candidate_id = :candidate_id "
    "AND chapter_gemini_files.expires_at IS NOT NULL "
    "AND chapter_gemini_files.expires_at > now() + interval '5 minutes'"
)

# Early pending marker (companion ask path): insert/reset to pending unless a
# fresh upload already exists or one is in flight, so a burst of polls enqueues
# at most once. Mirrors video_asset_service._ENSURE_PENDING_SQL.
_ENSURE_PENDING_SQL = text(
    f"""
    INSERT INTO chapter_gemini_files
        (id, chapter_id, candidate_id, status, created_at, updated_at)
    VALUES (:id, :chapter_id, :candidate_id, 'pending', now(), now())
    ON CONFLICT (chapter_id) DO UPDATE
        SET status = 'pending',
            candidate_id = :candidate_id,
            error_type = NULL,
            file_id = NULL,
            file_uri = NULL,
            mime_type = NULL,
            expires_at = NULL,
            updated_at = now()
        WHERE chapter_gemini_files.status NOT IN ('pending', 'uploading')
          AND NOT ({_FRESH_PREDICATE})
    """
)

# Atomic claim (worker): take ownership by flipping to 'uploading' UNLESS one is
# already uploading or a fresh file exists. RETURNING tells us whether we won.
_CLAIM_SQL = text(
    f"""
    INSERT INTO chapter_gemini_files
        (id, chapter_id, candidate_id, status, created_at, updated_at)
    VALUES (:id, :chapter_id, :candidate_id, 'uploading', now(), now())
    ON CONFLICT (chapter_id) DO UPDATE
        SET status = 'uploading',
            candidate_id = :candidate_id,
            error_type = NULL,
            file_id = NULL,
            file_uri = NULL,
            mime_type = NULL,
            expires_at = NULL,
            updated_at = now()
        WHERE chapter_gemini_files.status <> 'uploading'
          AND NOT ({_FRESH_PREDICATE})
    RETURNING id
    """
)


async def _get(db: AsyncSession, chapter_id: uuid.UUID) -> ChapterGeminiFile | None:
    result = await db.execute(
        select(ChapterGeminiFile).where(
            ChapterGeminiFile.chapter_id == chapter_id
        )
    )
    return result.scalar_one_or_none()


async def read_status(db: AsyncSession, *, chapter_id: uuid.UUID) -> str | None:
    """Current cache row status (pending/uploading/ready/failed), or None when no
    row exists yet. The companion prepare loop uses it to stop on `failed`."""
    row = await _get(db, chapter_id)
    return row.status if row is not None else None


async def read_usable(
    db: AsyncSession,
    *,
    chapter_id: uuid.UUID,
    candidate_id: uuid.UUID,
    now: datetime | None = None,
) -> VideoInput | None:
    """A ready, non-expired file reference for this chapter+candidate, else None.

    Reuses provider_files.is_expired (same safety margin) so the freshness rule
    lives in one place.
    """
    row = await _get(db, chapter_id)
    if (
        row is None
        or row.status != "ready"
        or row.candidate_id != candidate_id
        or not row.file_id
        or not row.file_uri
    ):
        return None
    video = inputs.from_provider_file(
        file_id=row.file_id,
        file_uri=row.file_uri,
        file_platform=provider_files.PLATFORM_AIHUBMIX_GEMINI,
        mime_type=row.mime_type,
        expires_at=row.expires_at,
    )
    if provider_files.is_expired(video, now=now):
        return None
    return video


async def ensure_pending(
    db: AsyncSession, *, chapter_id: uuid.UUID, candidate_id: uuid.UUID
) -> None:
    await db.execute(
        _ENSURE_PENDING_SQL,
        {"id": uuid.uuid4(), "chapter_id": chapter_id, "candidate_id": candidate_id},
    )
    await db.commit()


async def claim_for_ingest(
    db: AsyncSession, *, chapter_id: uuid.UUID, candidate_id: uuid.UUID
) -> bool:
    """Try to take ownership of the upload. False -> already uploading / fresh."""
    result = await db.execute(
        _CLAIM_SQL,
        {"id": uuid.uuid4(), "chapter_id": chapter_id, "candidate_id": candidate_id},
    )
    await db.commit()
    return result.first() is not None


async def mark_ready(
    db: AsyncSession,
    *,
    chapter_id: uuid.UUID,
    candidate_id: uuid.UUID,
    video: VideoInput,
) -> None:
    """Store the uploaded Gemini file reference (from provider_files.upload_video)."""
    row = await _get(db, chapter_id)
    if row is None:
        return  # row swept mid-ingest (unlikely); drop the result
    row.status = "ready"
    row.candidate_id = candidate_id
    row.file_id = video.file_id
    row.file_uri = video.url
    row.mime_type = video.mime_type
    row.expires_at = video.expires_at
    row.error_type = None
    await db.commit()


async def mark_failed(
    db: AsyncSession, *, chapter_id: uuid.UUID, error_type: str | None
) -> None:
    row = await _get(db, chapter_id)
    if row is None:
        return
    row.status = "failed"
    row.error_type = (error_type or "")[:200] or None
    await db.commit()
