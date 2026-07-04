"""视频资产编排：就近预热 + 懒加载兜底 + 滑动过期清理。

Owns the ChapterVideoAsset ORM. Composes course_service (ownership + chapter
ordering) and core/storage (sign URLs). The Celery download/cleanup tasks call
the claim/mark/expire helpers here; the API GET calls get_chapter_video.

IDOR 红线: get_chapter_video resolves a chapter only WITHIN an owned course —
foreign / unknown / no-chosen-video all collapse to None -> 404.

State machine (chapter_video_assets.status): pending -> downloading -> ready,
or -> failed. The API collapses pending/downloading into the wire `downloading`
(client polls). claim_for_download is the atomic guard that stops two workers
downloading the same chapter; ensure_pending (API path) writes the row early so
rapid polls don't enqueue a storm before the worker claims it.
"""

import logging
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core import storage
from core.config import settings
from core.security import CurrentUser
from models.chapter_video_asset import ChapterVideoAsset
from models.course import CourseChapter, CourseUnit
from models.course_candidate import ChapterVideoCandidate
from schemas.course import ChapterVideoOut, VideoAuthorOut, VideoSourceOut
from services import course_service

logger = logging.getLogger("lemma.services.video_asset")

# Re-write last_accessed_at at most this often (sliding-expiry truth), so the
# downloading-state poll and rapid re-opens don't hammer the row.
_ACCESS_BUMP_INTERVAL = timedelta(hours=1)
# A failed asset stays `failed` (the poll stops) until this cooldown passes;
# re-opening the chapter later then retries. Distinguishes a poll (rapid, same
# failure) from a deliberate re-visit (minutes later) without a retry endpoint.
_FAILED_RETRY_COOLDOWN = timedelta(minutes=2)


@dataclass
class DownloadTarget:
    """What the worker needs to fetch one chapter's chosen video."""

    candidate_id: uuid.UUID
    platform: str
    platform_video_id: str
    url: str
    duration_s: int | None


@dataclass
class ExpiredAsset:
    id: uuid.UUID
    storage_path: str | None


def _author_homepage(platform: str, author_id: str | None) -> str | None:
    """Channel/space homepage from the platform id, when one exists.

    Bilibili exposes a stable space id (mid); YouTube search items don't carry a
    clean channel id (author_id is None) -> no link, the frontend hides it.
    """
    if not author_id:
        return None
    if platform == "bilibili":
        return f"https://space.bilibili.com/{author_id}"
    return None


def _video_dto(
    *,
    status: str,
    candidate: ChapterVideoCandidate,
    playback_url: str | None,
    expires_at: datetime | None,
) -> ChapterVideoOut:
    return ChapterVideoOut(
        status=status,  # type: ignore[arg-type]
        playback_url=playback_url,
        source=VideoSourceOut(
            platform=candidate.platform, title=candidate.title, url=candidate.url
        ),
        author=VideoAuthorOut(
            name=candidate.author,
            homepage_url=_author_homepage(candidate.platform, candidate.author_id),
        ),
        expires_at=expires_at,
    )


async def _get_asset(
    db: AsyncSession, chapter_id: uuid.UUID
) -> ChapterVideoAsset | None:
    result = await db.execute(
        select(ChapterVideoAsset).where(ChapterVideoAsset.chapter_id == chapter_id)
    )
    return result.scalar_one_or_none()


async def _resolve_chapter_candidate(
    db: AsyncSession, *, course_id: uuid.UUID, chapter_id: uuid.UUID
) -> tuple[CourseChapter, ChapterVideoCandidate] | None:
    """The chapter (only if it belongs to course_id) + its chosen candidate."""
    result = await db.execute(
        select(CourseChapter)
        .join(CourseUnit, CourseChapter.unit_id == CourseUnit.id)
        .where(CourseChapter.id == chapter_id, CourseUnit.course_id == course_id)
    )
    chapter = result.scalar_one_or_none()
    if chapter is None or chapter.chosen_candidate_id is None:
        return None
    candidate = await db.get(ChapterVideoCandidate, chapter.chosen_candidate_id)
    if candidate is None:
        return None
    return chapter, candidate


def _is_valid_ready(
    asset: ChapterVideoAsset, candidate: ChapterVideoCandidate
) -> bool:
    return (
        asset.status == "ready"
        and asset.storage_path is not None
        and asset.candidate_id == candidate.id
        and (asset.expires_at is None or asset.expires_at > datetime.now(UTC))
    )


async def _bump_access(db: AsyncSession, asset: ChapterVideoAsset) -> None:
    """Slide the expiry clock forward on playback (throttled to avoid per-poll writes)."""
    now = datetime.now(UTC)
    if (
        asset.last_accessed_at is not None
        and now - asset.last_accessed_at < _ACCESS_BUMP_INTERVAL
    ):
        return
    asset.last_accessed_at = now
    asset.expires_at = now + timedelta(days=settings.video_asset_ttl_days)
    await db.commit()


async def get_chapter_video(
    db: AsyncSession,
    user: CurrentUser,
    *,
    course_id: uuid.UUID,
    chapter_id: uuid.UUID,
) -> ChapterVideoOut | None:
    """Resolve a chapter's playable video, driving the preheat/lazy state machine.

    Returns None (-> 404) when the course isn't the caller's, the chapter isn't
    in it, or the chapter has no chosen video. Otherwise always returns a DTO
    (ready/downloading/failed) and triggers downloads/prefetch as a side effect.
    """
    course = await course_service.get_owned_course(
        db, user_id=user.id, course_id=course_id
    )
    if course is None:
        return None
    resolved = await _resolve_chapter_candidate(
        db, course_id=course_id, chapter_id=chapter_id
    )
    if resolved is None:
        return None
    _chapter, candidate = resolved
    asset = await _get_asset(db, chapter_id)

    if asset is not None and _is_valid_ready(asset, candidate):
        await _bump_access(db, asset)
        try:
            playback_url = await storage.create_signed_url(
                asset.storage_path or "",
                expires_in=settings.video_signed_url_ttl_seconds,
            )
        except storage.StorageError:
            logger.exception("failed to sign playback url for chapter %s", chapter_id)
            # Asset exists but signing failed (config/transient): present as
            # downloading so the client retries instead of seeing a hard failure.
            return _video_dto(
                status="downloading",
                candidate=candidate,
                playback_url=None,
                expires_at=None,
            )
        await _enqueue_prefetch_next(
            db, course_id=course_id, after_chapter_id=chapter_id
        )
        url_expiry = datetime.now(UTC) + timedelta(
            seconds=settings.video_signed_url_ttl_seconds
        )
        return _video_dto(
            status="ready",
            candidate=candidate,
            playback_url=playback_url,
            expires_at=url_expiry,
        )

    if (
        asset is not None
        and asset.status == "failed"
        and asset.candidate_id == candidate.id
        and datetime.now(UTC) - asset.updated_at < _FAILED_RETRY_COOLDOWN
    ):
        # A fresh attempt just failed: report it (the poll stops). A later
        # re-visit (past the cooldown) falls through and retries.
        return _video_dto(
            status="failed", candidate=candidate, playback_url=None, expires_at=None
        )

    if (
        asset is not None
        and asset.status in ("pending", "downloading")
        and asset.candidate_id == candidate.id
    ):
        # A download is already in flight — don't enqueue again, just report.
        return _video_dto(
            status="downloading",
            candidate=candidate,
            playback_url=None,
            expires_at=None,
        )

    # Missing / expired / stale (re-pick) / failed-past-cooldown: (re)create a
    # pending row and enqueue the download (lazy fallback).
    await _ensure_pending(db, chapter_id=chapter_id, candidate_id=candidate.id)
    _enqueue_download(chapter_id)
    return _video_dto(
        status="downloading", candidate=candidate, playback_url=None, expires_at=None
    )


# --- companion-facing helpers (AI 伴学: feed the chapter video to Gemini) ---


@dataclass
class StoredVideo:
    """A chapter's READY re-hosted video object in Storage (for companion ingest)."""

    candidate_id: uuid.UUID
    storage_bucket: str
    storage_path: str
    mime_type: str | None
    # Long-video policy input (ai/video_limits): >50min chapters are sent to the
    # model at LOW media resolution to stay under the provider token cap.
    duration_s: int | None


async def get_chapter_chosen_candidate_id(
    db: AsyncSession, *, course_id: uuid.UUID, chapter_id: uuid.UUID
) -> uuid.UUID | None:
    """The chapter's chosen candidate id, ONLY if the chapter is in course_id.

    IDOR red line (mirrors get_chapter_video): foreign / unknown / no-chosen-video
    all collapse to None. The companion keys its Gemini-file cache on this id.
    """
    resolved = await _resolve_chapter_candidate(
        db, course_id=course_id, chapter_id=chapter_id
    )
    return resolved[1].id if resolved is not None else None


async def get_chapter_chosen_candidate_ref(
    db: AsyncSession, *, course_id: uuid.UUID, chapter_id: uuid.UUID
) -> tuple[uuid.UUID, int | None] | None:
    """(candidate_id, duration_s) with the same IDOR rules as above.

    The duration feeds the long-video media-resolution downgrade (ai/video_limits)
    so the companion sends >50min chapters at LOW — matching the overview's
    choice keeps implicit context caching hitting AND stays under the token cap.
    """
    resolved = await _resolve_chapter_candidate(
        db, course_id=course_id, chapter_id=chapter_id
    )
    if resolved is None:
        return None
    return resolved[1].id, resolved[1].duration_s


async def get_chapter_asset_status(
    db: AsyncSession, *, chapter_id: uuid.UUID
) -> str | None:
    """The chapter video's download status (pending/downloading/ready/failed),
    or None when no asset row exists yet. The companion gates Gemini ingest on
    `ready` (only a fully downloaded asset has a body to upload)."""
    asset = await _get_asset(db, chapter_id)
    return asset.status if asset is not None else None


async def ensure_download(
    db: AsyncSession, *, chapter_id: uuid.UUID, candidate_id: uuid.UUID
) -> str:
    """Drive the chapter's chosen-candidate download, enqueuing it when missing /
    stale / failed-past-cooldown. Returns the resulting asset status
    (ready / downloading / failed). Ownership is enforced upstream (same
    convention as get_ready_stored_video / load_download_target — no user/course
    filter here), so the overview SSE + companion video tool can self-drive the
    「无资产→下载」 step (决策④) without re-checking IDOR every poll tick.
    """
    asset = await _get_asset(db, chapter_id)
    if asset is not None and asset.candidate_id == candidate_id:
        if asset.status == "ready" and asset.storage_path:
            return "ready"
        if asset.status in ("pending", "downloading"):
            return "downloading"
        if (
            asset.status == "failed"
            and datetime.now(UTC) - asset.updated_at < _FAILED_RETRY_COOLDOWN
        ):
            return "failed"
    # Missing / expired / stale (re-pick) / failed-past-cooldown: (re)create a
    # pending row and enqueue the download (lazy, mirrors get_chapter_video).
    await _ensure_pending(db, chapter_id=chapter_id, candidate_id=candidate_id)
    _enqueue_download(chapter_id)
    return "downloading"


async def get_ready_stored_video(
    db: AsyncSession, *, chapter_id: uuid.UUID
) -> StoredVideo | None:
    """The chapter's READY re-hosted video (object key + candidate), else None.

    Worker-side (companion ingest): only a fully downloaded asset has a
    storage_path to pull the body from. No course/user filter — the API already
    enforced ownership before enqueuing (same convention as load_download_target).
    """
    asset = await _get_asset(db, chapter_id)
    if (
        asset is None
        or asset.status != "ready"
        or not asset.storage_path
        or asset.candidate_id is None
    ):
        return None
    return StoredVideo(
        candidate_id=asset.candidate_id,
        storage_bucket=asset.storage_bucket or settings.supabase_storage_bucket,
        storage_path=asset.storage_path,
        mime_type=asset.mime_type,
        duration_s=asset.duration_s,
    )


# --- worker-facing helpers (download task) ---


async def load_download_target(
    db: AsyncSession, *, chapter_id: uuid.UUID
) -> DownloadTarget | None:
    """The chapter's chosen candidate, as the flat shape the worker downloads."""
    result = await db.execute(
        select(ChapterVideoCandidate).join(
            CourseChapter,
            CourseChapter.chosen_candidate_id == ChapterVideoCandidate.id,
        ).where(CourseChapter.id == chapter_id)
    )
    candidate = result.scalar_one_or_none()
    if candidate is None:
        return None
    return DownloadTarget(
        candidate_id=candidate.id,
        platform=candidate.platform,
        platform_video_id=candidate.platform_video_id,
        url=candidate.url,
        duration_s=candidate.duration_s,
    )


# Atomic claim: insert a downloading row, or flip an existing one to downloading
# UNLESS it's already downloading (another worker owns it) or ready (nothing to
# do). RETURNING tells us whether we won the claim.
_CLAIM_SQL = text(
    """
    INSERT INTO chapter_video_assets
        (id, chapter_id, candidate_id, status, created_at, updated_at)
    VALUES (:id, :chapter_id, :candidate_id, 'downloading', now(), now())
    ON CONFLICT (chapter_id) DO UPDATE
        SET status = 'downloading',
            candidate_id = :candidate_id,
            error_type = NULL,
            download_backend = NULL,
            updated_at = now()
        WHERE chapter_video_assets.status NOT IN ('downloading', 'ready')
    RETURNING id
    """
)

# Early pending marker (API path): insert/reset to pending unless a download is
# already pending or in flight, so a burst of polls enqueues at most once.
_ENSURE_PENDING_SQL = text(
    """
    INSERT INTO chapter_video_assets
        (id, chapter_id, candidate_id, status, created_at, updated_at)
    VALUES (:id, :chapter_id, :candidate_id, 'pending', now(), now())
    ON CONFLICT (chapter_id) DO UPDATE
        SET status = 'pending',
            candidate_id = :candidate_id,
            error_type = NULL,
            download_backend = NULL,
            updated_at = now()
        WHERE chapter_video_assets.status NOT IN ('pending', 'downloading')
    """
)


async def claim_for_download(
    db: AsyncSession, *, chapter_id: uuid.UUID, candidate_id: uuid.UUID
) -> bool:
    """Try to take ownership of the download. False -> someone else has it / ready."""
    result = await db.execute(
        _CLAIM_SQL,
        {"id": uuid.uuid4(), "chapter_id": chapter_id, "candidate_id": candidate_id},
    )
    await db.commit()
    return result.first() is not None


async def _ensure_pending(
    db: AsyncSession, *, chapter_id: uuid.UUID, candidate_id: uuid.UUID
) -> None:
    await db.execute(
        _ENSURE_PENDING_SQL,
        {"id": uuid.uuid4(), "chapter_id": chapter_id, "candidate_id": candidate_id},
    )
    await db.commit()


async def mark_ready(
    db: AsyncSession,
    *,
    chapter_id: uuid.UUID,
    candidate_id: uuid.UUID,
    storage_bucket: str,
    storage_path: str,
    size_bytes: int | None,
    mime_type: str | None,
    duration_s: int | None,
    download_backend: str | None,
) -> None:
    asset = await _get_asset(db, chapter_id)
    if asset is None:
        return  # row was swept mid-download (extremely unlikely); drop the result
    now = datetime.now(UTC)
    asset.status = "ready"
    asset.candidate_id = candidate_id
    asset.storage_bucket = storage_bucket
    asset.storage_path = storage_path
    asset.download_backend = download_backend
    asset.size_bytes = size_bytes
    asset.mime_type = mime_type
    asset.duration_s = duration_s
    asset.error_type = None
    asset.downloaded_at = now
    asset.last_accessed_at = now
    asset.expires_at = now + timedelta(days=settings.video_asset_ttl_days)
    await db.commit()


async def mark_failed(
    db: AsyncSession, *, chapter_id: uuid.UUID, error_type: str | None
) -> None:
    asset = await _get_asset(db, chapter_id)
    if asset is None:
        return
    asset.status = "failed"
    asset.error_type = (error_type or "")[:200] or None
    asset.download_backend = None
    await db.commit()


# --- cleanup (beat task) ---


async def list_expired_assets(
    db: AsyncSession, *, cutoff: datetime
) -> list[ExpiredAsset]:
    """Assets untouched since `cutoff` (sliding window). storage_path may be None
    for never-finished rows — the caller only deletes objects for non-null ones."""
    result = await db.execute(
        select(ChapterVideoAsset.id, ChapterVideoAsset.storage_path).where(
            func.coalesce(
                ChapterVideoAsset.last_accessed_at,
                ChapterVideoAsset.downloaded_at,
                ChapterVideoAsset.created_at,
            )
            < cutoff
        )
    )
    return [ExpiredAsset(id=row[0], storage_path=row[1]) for row in result.all()]


async def delete_assets(db: AsyncSession, *, ids: list[uuid.UUID]) -> None:
    if not ids:
        return
    await db.execute(
        delete(ChapterVideoAsset).where(ChapterVideoAsset.id.in_(ids))
    )
    await db.commit()


# --- enqueue helpers (lazy import: tasks import this module) ---


def _enqueue_download(chapter_id: uuid.UUID) -> None:
    from tasks.video_download import download_chapter_video

    download_chapter_video.delay(str(chapter_id))


async def _enqueue_prefetch_next(
    db: AsyncSession, *, course_id: uuid.UUID, after_chapter_id: uuid.UUID
) -> None:
    """就近预热: accessing chapter N warms chapter N+1's video (if not already)."""
    ordered = await course_service.get_ordered_playable_chapter_ids(
        db, course_id=course_id
    )
    try:
        index = ordered.index(after_chapter_id)
    except ValueError:
        return
    if index + 1 >= len(ordered):
        return
    next_id = ordered[index + 1]
    asset = await _get_asset(db, next_id)
    if asset is not None and asset.status in ("pending", "downloading", "ready"):
        return
    _enqueue_download(next_id)
