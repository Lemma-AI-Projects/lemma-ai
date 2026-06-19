"""课程级广搜候选池 + 搜索子状态（搜索前置）。

Owns the course_search_candidates table and Course.search_status. Maps between
the boundary VideoCandidate and pool rows. The broad-search Celery task persists
the pool and flips search_status; organize reads the pool back as VideoCandidates
and gates on search_status (握手协议 C2).

IDOR note: the pool is internal — never exposed by an API. Access is always
scoped by course_id, and the user-facing course endpoints already enforce
ownership before any organize/search work is triggered.
"""

import uuid

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ai.search import SearchPlatform, VideoCandidate
from models.course import Course
from models.course_search_candidate import CourseSearchCandidate

# search_status values (mirror models/course.py CheckConstraint).
SEARCHING = "searching"
SEARCHED = "searched"
SEARCH_FAILED = "failed"


async def set_search_status(
    db: AsyncSession, *, course_id: uuid.UUID, status: str
) -> None:
    await db.execute(
        update(Course).where(Course.id == course_id).values(search_status=status)
    )
    await db.commit()


async def read_search_status(
    db: AsyncSession, *, course_id: uuid.UUID
) -> str | None:
    """Current search_status, or None when the course is gone."""
    result = await db.execute(
        select(Course.search_status).where(Course.id == course_id)
    )
    return result.scalar_one_or_none()


async def persist_search_candidates(
    db: AsyncSession, *, course_id: uuid.UUID, candidates: list[VideoCandidate]
) -> int:
    """Replace the course's candidate pool with `candidates` (clean slate first
    so a re-run never doubles it). Returns the number stored."""
    await db.execute(
        delete(CourseSearchCandidate).where(
            CourseSearchCandidate.course_id == course_id
        )
    )
    for candidate in candidates:
        db.add(
            CourseSearchCandidate(
                course_id=course_id,
                platform=candidate.platform.value,
                platform_video_id=candidate.platform_video_id,
                url=candidate.url,
                title=candidate.title,
                author=candidate.author,
                author_id=candidate.author_id,
                duration_s=candidate.duration_s,
                view_count=candidate.view_count,
                like_count=candidate.like_count,
                comment_count=candidate.comment_count,
                published_at=candidate.published_at,
                thumbnail_url=candidate.thumbnail_url,
                description=candidate.description,
                tags=candidate.tags or None,
                metrics=candidate.metrics or None,
                raw_json=candidate.raw,
            )
        )
    await db.commit()
    return len(candidates)


async def load_search_candidates(
    db: AsyncSession, *, course_id: uuid.UUID
) -> list[VideoCandidate]:
    """The course's pool as boundary VideoCandidates (for compose)."""
    result = await db.execute(
        select(CourseSearchCandidate).where(
            CourseSearchCandidate.course_id == course_id
        )
    )
    return [_to_candidate(row) for row in result.scalars()]


def _to_candidate(row: CourseSearchCandidate) -> VideoCandidate:
    return VideoCandidate(
        platform=SearchPlatform(row.platform),
        platform_video_id=row.platform_video_id,
        url=row.url,
        title=row.title,
        author=row.author,
        author_id=row.author_id,
        duration_s=row.duration_s,
        view_count=row.view_count,
        like_count=row.like_count,
        comment_count=row.comment_count,
        published_at=row.published_at,
        thumbnail_url=row.thumbnail_url,
        description=row.description,
        tags=row.tags or [],
        metrics=row.metrics or {},
        raw=row.raw_json or {},
    )
