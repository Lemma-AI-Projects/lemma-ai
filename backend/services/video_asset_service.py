"""视频资产编排：就近预热 + 懒加载兜底 + 滑动过期清理。

Owns the PointVideoAsset ORM. Composes course_service (ownership + learning
order) and core/storage (sign URLs, delete objects). The Celery download/cleanup
tasks call the claim/mark/expire helpers here; the API GET calls get_point_video.

IDOR 红线: get_point_video resolves a point only WITHIN an owned course —
foreign / unknown / no-chosen-video all collapse to None -> 404.

State machine (point_video_assets.status): pending -> downloading -> ready,
or -> failed. The API collapses pending/downloading into the wire `downloading`
(client polls). claim_for_download is the atomic guard that stops two workers
downloading the same point; ensure_pending (API path) writes the row early so
rapid polls don't enqueue a storm before the worker claims it.
"""

import logging
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import anyio
from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core import storage
from core.config import settings
from core.security import CurrentUser
from models.course import CourseLesson, CourseModule, CoursePoint
from models.point_video_asset import PointVideoAsset
from models.point_video_candidate import PointVideoCandidate
from schemas.course import PointVideoOut, VideoAuthorOut, VideoSourceOut
from services import course_service

logger = logging.getLogger("lemma.services.video_asset")

# Re-write last_accessed_at at most this often (sliding-expiry truth), so the
# downloading-state poll and rapid re-opens don't hammer the row.
_ACCESS_BUMP_INTERVAL = timedelta(hours=1)
# A failed asset stays `failed` (the poll stops) until this cooldown passes;
# re-opening the point later then retries. Distinguishes a poll (rapid, same
# failure) from a deliberate re-visit (minutes later) without a retry endpoint.
_FAILED_RETRY_COOLDOWN = timedelta(minutes=2)


@dataclass
class DownloadTarget:
    """What the worker needs to fetch one point's chosen video."""

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
    candidate: PointVideoCandidate,
    playback_url: str | None,
    expires_at: datetime | None,
) -> PointVideoOut:
    return PointVideoOut(
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
    db: AsyncSession, point_id: uuid.UUID
) -> PointVideoAsset | None:
    result = await db.execute(
        select(PointVideoAsset).where(PointVideoAsset.point_id == point_id)
    )
    return result.scalar_one_or_none()


async def _resolve_point_candidate(
    db: AsyncSession, *, course_id: uuid.UUID, point_id: uuid.UUID
) -> tuple[CoursePoint, PointVideoCandidate] | None:
    """The point (only if it belongs to course_id) + its chosen candidate."""
    result = await db.execute(
        select(CoursePoint)
        .join(CourseLesson, CoursePoint.lesson_id == CourseLesson.id)
        .join(CourseModule, CourseLesson.module_id == CourseModule.id)
        .where(CoursePoint.id == point_id, CourseModule.course_id == course_id)
    )
    point = result.scalar_one_or_none()
    if point is None or point.chosen_candidate_id is None:
        return None
    candidate = await db.get(PointVideoCandidate, point.chosen_candidate_id)
    if candidate is None:
        return None
    return point, candidate


def _is_valid_ready(
    asset: PointVideoAsset, candidate: PointVideoCandidate
) -> bool:
    return (
        asset.status == "ready"
        and asset.storage_path is not None
        and asset.candidate_id == candidate.id
        and (asset.expires_at is None or asset.expires_at > datetime.now(UTC))
    )


async def _bump_access(db: AsyncSession, asset: PointVideoAsset) -> None:
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


async def get_point_video(
    db: AsyncSession,
    user: CurrentUser,
    *,
    course_id: uuid.UUID,
    point_id: uuid.UUID,
) -> PointVideoOut | None:
    """Resolve a point's playable video, driving the preheat/lazy state machine.

    Returns None (-> 404) when the course isn't the caller's, the point isn't
    in it, or the point has no chosen video. Otherwise always returns a DTO
    (ready/downloading/failed) and triggers downloads/prefetch as a side effect.
    """
    course = await course_service.get_owned_course(
        db, user_id=user.id, course_id=course_id
    )
    if course is None:
        return None
    resolved = await _resolve_point_candidate(
        db, course_id=course_id, point_id=point_id
    )
    if resolved is None:
        return None
    _point, candidate = resolved
    asset = await _get_asset(db, point_id)

    if asset is not None and _is_valid_ready(asset, candidate):
        await _bump_access(db, asset)
        try:
            playback_url = await storage.create_signed_url(
                asset.storage_path or "",
                expires_in=settings.video_signed_url_ttl_seconds,
            )
        except storage.StorageError:
            logger.exception("failed to sign playback url for point %s", point_id)
            # Asset exists but signing failed (config/transient): present as
            # downloading so the client retries instead of seeing a hard failure.
            return _video_dto(
                status="downloading",
                candidate=candidate,
                playback_url=None,
                expires_at=None,
            )
        await _enqueue_prefetch_next(db, course_id=course_id, after_point_id=point_id)
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
    await _ensure_pending(db, point_id=point_id, candidate_id=candidate.id)
    _enqueue_download(point_id)
    return _video_dto(
        status="downloading", candidate=candidate, playback_url=None, expires_at=None
    )


# --- companion-facing helpers (AI 伴学: feed the point's video to Gemini) ---


@dataclass
class StoredVideo:
    """A point's READY re-hosted video object in Storage (for companion ingest)."""

    candidate_id: uuid.UUID
    storage_bucket: str
    storage_path: str
    mime_type: str | None
    # Long-video policy input (ai/video_limits): >50min videos are sent to the
    # model at LOW media resolution to stay under the provider token cap.
    duration_s: int | None


async def get_point_chosen_candidate_ref(
    db: AsyncSession, *, course_id: uuid.UUID, point_id: uuid.UUID
) -> tuple[uuid.UUID, int | None] | None:
    """(candidate_id, duration_s), ONLY if the point is in course_id.

    IDOR red line (mirrors get_point_video): foreign / unknown / no-chosen-video
    all collapse to None. The companion keys its Gemini-file cache on the id, and
    the duration feeds the long-video media-resolution downgrade
    (ai/video_limits) so >50min videos are sent at LOW.
    """
    resolved = await _resolve_point_candidate(
        db, course_id=course_id, point_id=point_id
    )
    if resolved is None:
        return None
    return resolved[1].id, resolved[1].duration_s


async def get_point_asset_status(
    db: AsyncSession, *, point_id: uuid.UUID
) -> str | None:
    """The point video's download status (pending/downloading/ready/failed),
    or None when no asset row exists yet."""
    asset = await _get_asset(db, point_id)
    return asset.status if asset is not None else None


async def ensure_download(
    db: AsyncSession, *, point_id: uuid.UUID, candidate_id: uuid.UUID
) -> str:
    """Drive the point's chosen-candidate download, enqueuing it when missing /
    stale / failed-past-cooldown. Returns the resulting asset status
    (ready / downloading / failed). Ownership is enforced upstream (same
    convention as get_ready_stored_video / load_download_target — no user/course
    filter here), so the companion video tool can self-drive the 「无资产→下载」
    step (决策④) without re-checking IDOR every poll tick.
    """
    asset = await _get_asset(db, point_id)
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
    # pending row and enqueue the download (lazy, mirrors get_point_video).
    await _ensure_pending(db, point_id=point_id, candidate_id=candidate_id)
    _enqueue_download(point_id)
    return "downloading"


async def get_ready_stored_video(
    db: AsyncSession, *, point_id: uuid.UUID
) -> StoredVideo | None:
    """The point's READY re-hosted video (object key + candidate), else None.

    Worker-side (companion ingest): only a fully downloaded asset has a
    storage_path to pull the body from. No course/user filter — the API already
    enforced ownership before enqueuing (same convention as load_download_target).
    """
    asset = await _get_asset(db, point_id)
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
    db: AsyncSession, *, point_id: uuid.UUID
) -> DownloadTarget | None:
    """The point's chosen candidate, as the flat shape the worker downloads."""
    result = await db.execute(
        select(PointVideoCandidate)
        .join(
            CoursePoint,
            CoursePoint.chosen_candidate_id == PointVideoCandidate.id,
        )
        .where(CoursePoint.id == point_id)
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
    INSERT INTO point_video_assets
        (id, point_id, candidate_id, status, created_at, updated_at)
    VALUES (:id, :point_id, :candidate_id, 'downloading', now(), now())
    ON CONFLICT (point_id) DO UPDATE
        SET status = 'downloading',
            candidate_id = :candidate_id,
            error_type = NULL,
            download_backend = NULL,
            updated_at = now()
        WHERE point_video_assets.status NOT IN ('downloading', 'ready')
    RETURNING id
    """
)

# Early pending marker (API path): insert/reset to pending unless a download is
# already pending or in flight, so a burst of polls enqueues at most once.
_ENSURE_PENDING_SQL = text(
    """
    INSERT INTO point_video_assets
        (id, point_id, candidate_id, status, created_at, updated_at)
    VALUES (:id, :point_id, :candidate_id, 'pending', now(), now())
    ON CONFLICT (point_id) DO UPDATE
        SET status = 'pending',
            candidate_id = :candidate_id,
            error_type = NULL,
            download_backend = NULL,
            updated_at = now()
        WHERE point_video_assets.status NOT IN ('pending', 'downloading')
    """
)


async def claim_for_download(
    db: AsyncSession, *, point_id: uuid.UUID, candidate_id: uuid.UUID
) -> bool:
    """Try to take ownership of the download. False -> someone else has it / ready."""
    result = await db.execute(
        _CLAIM_SQL,
        {"id": uuid.uuid4(), "point_id": point_id, "candidate_id": candidate_id},
    )
    await db.commit()
    return result.first() is not None


async def _ensure_pending(
    db: AsyncSession, *, point_id: uuid.UUID, candidate_id: uuid.UUID
) -> None:
    await db.execute(
        _ENSURE_PENDING_SQL,
        {"id": uuid.uuid4(), "point_id": point_id, "candidate_id": candidate_id},
    )
    await db.commit()


async def mark_ready(
    db: AsyncSession,
    *,
    point_id: uuid.UUID,
    candidate_id: uuid.UUID,
    storage_bucket: str,
    storage_path: str,
    size_bytes: int | None,
    mime_type: str | None,
    duration_s: int | None,
    download_backend: str | None,
) -> None:
    asset = await _get_asset(db, point_id)
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
    db: AsyncSession, *, point_id: uuid.UUID, error_type: str | None
) -> None:
    asset = await _get_asset(db, point_id)
    if asset is None:
        return
    asset.status = "failed"
    asset.error_type = (error_type or "")[:200] or None
    asset.download_backend = None
    await db.commit()


# --- cleanup (beat task + course delete) ---


async def list_expired_assets(
    db: AsyncSession, *, cutoff: datetime
) -> list[ExpiredAsset]:
    """Assets untouched since `cutoff` (sliding window). storage_path may be None
    for never-finished rows — the caller only deletes objects for non-null ones."""
    result = await db.execute(
        select(PointVideoAsset.id, PointVideoAsset.storage_path).where(
            func.coalesce(
                PointVideoAsset.last_accessed_at,
                PointVideoAsset.downloaded_at,
                PointVideoAsset.created_at,
            )
            < cutoff
        )
    )
    return [ExpiredAsset(id=row[0], storage_path=row[1]) for row in result.all()]


async def delete_assets(db: AsyncSession, *, ids: list[uuid.UUID]) -> None:
    if not ids:
        return
    await db.execute(delete(PointVideoAsset).where(PointVideoAsset.id.in_(ids)))
    await db.commit()


def _delete_objects_sync(keys: list[str]) -> int:
    client = storage.build_s3_client()
    return len(storage.delete_objects(client, keys=keys))


async def purge_course_objects(db: AsyncSession, *, course_id: uuid.UUID) -> int:
    """Delete every Storage object belonging to a course, before its rows go.

    Storage has no FK cascade, so deleting a course without this leaves its mp4s
    orphaned forever (nothing else can find their keys again). Best effort: a
    storage outage must not block the delete — the objects would then be swept
    by the expiry job or stay as (rare) orphans.
    """
    keys = (
        (
            await db.execute(
                select(PointVideoAsset.storage_path)
                .join(CoursePoint, PointVideoAsset.point_id == CoursePoint.id)
                .join(CourseLesson, CoursePoint.lesson_id == CourseLesson.id)
                .join(CourseModule, CourseLesson.module_id == CourseModule.id)
                .where(
                    CourseModule.course_id == course_id,
                    PointVideoAsset.storage_path.isnot(None),
                )
            )
        )
        .scalars()
        .all()
    )
    if not keys:
        return 0
    try:
        return await anyio.to_thread.run_sync(_delete_objects_sync, list(keys))
    except Exception:  # noqa: BLE001 — never block the delete on storage
        logger.exception(
            "failed to purge storage objects for course %s (%d key(s))",
            course_id,
            len(keys),
        )
        return 0


# --- enqueue helpers (lazy import: tasks import this module) ---


def _enqueue_download(point_id: uuid.UUID) -> None:
    from tasks.video_download import download_point_video

    download_point_video.delay(str(point_id))


async def _enqueue_prefetch_next(
    db: AsyncSession, *, course_id: uuid.UUID, after_point_id: uuid.UUID
) -> None:
    """就近预热: opening point N warms point N+1's video (if not already)."""
    ordered = await course_service.get_ordered_playable_point_ids(
        db, course_id=course_id
    )
    try:
        index = ordered.index(after_point_id)
    except ValueError:
        return
    if index + 1 >= len(ordered):
        return
    next_id = ordered[index + 1]
    asset = await _get_asset(db, next_id)
    if asset is not None and asset.status in ("pending", "downloading", "ready"):
        return
    _enqueue_download(next_id)
