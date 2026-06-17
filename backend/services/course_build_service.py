"""阶段二 build persistence + state machine. coursegen never touches the ORM;
it produces ChapterResearchResult and this module lands it in the DB.

Progress truth lives here (DB): the worker updates chapter status/progress as it
goes; the SSE endpoint only reads course_service snapshots. No Redis pub/sub.
"""

import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ai.coursegen.types import ChapterPlan, ChapterResearchResult
from models.course import Course, CourseChapter, CourseUnit
from models.course_candidate import ChapterVideoCandidate
from services import course_service

_READY = "ready"
_FAILED = "failed"
_BUILDING = "building"
_RESEARCHING = "researching"
_CHAPTER_DONE = 100


async def mark_building(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID
) -> Course | None:
    """API gate: owned course -> status=building before enqueue. None -> 404."""
    course = await course_service.get_owned_course(
        db, user_id=user_id, course_id=course_id
    )
    if course is None:
        return None
    course.status = _BUILDING
    await db.commit()
    await db.refresh(course)
    return course


async def load_build_context(
    db: AsyncSession, *, course_id: uuid.UUID
) -> tuple[dict[str, str], list[tuple[uuid.UUID, ChapterPlan]]] | None:
    """Begin a build: flip to building, return (profile, pending chapters).

    Worker-side — course_id was authorized when the API enqueued, so no user
    filter. Pending excludes already-ready chapters (idempotent rerun). None ->
    course gone.
    """
    result = await db.execute(
        select(Course)
        .where(Course.id == course_id)
        .options(selectinload(Course.units).selectinload(CourseUnit.chapters))
    )
    course = result.scalar_one_or_none()
    if course is None:
        return None
    course.status = _BUILDING
    profile: dict[str, str] = {}
    if course.intake_json:
        profile = course.intake_json.get("answers") or {}
    pending = [
        (chapter.id, ChapterPlan(title=chapter.title, summary=chapter.summary or ""))
        for unit in course.units
        for chapter in unit.chapters
        if chapter.status != _READY
    ]
    await db.commit()
    return profile, pending


async def mark_chapter_researching(
    db: AsyncSession, *, chapter_id: uuid.UUID
) -> None:
    chapter = await db.get(CourseChapter, chapter_id)
    if chapter is not None:
        chapter.status = _RESEARCHING
        await db.commit()


async def persist_chapter_result(
    db: AsyncSession, *, chapter_id: uuid.UUID, result: ChapterResearchResult
) -> None:
    """Land every candidate, flag the chosen one, set the chapter's terminal state.

    Clean slate first (delete prior candidates) so a re-research never doubles
    the pool. chosen set -> ready + chosen_candidate_id; chosen None -> failed.
    """
    await db.execute(
        delete(ChapterVideoCandidate).where(
            ChapterVideoCandidate.chapter_id == chapter_id
        )
    )
    chosen_row: ChapterVideoCandidate | None = None
    for candidate in result.candidates:
        row = ChapterVideoCandidate(
            chapter_id=chapter_id,
            platform=candidate.platform.value,
            platform_video_id=candidate.platform_video_id,
            url=candidate.url,
            title=candidate.title,
            author=candidate.author,
            duration_s=candidate.duration_s,
            view_count=candidate.view_count,
            like_count=candidate.like_count,
            thumbnail_url=candidate.thumbnail_url,
            is_chosen=candidate is result.chosen,
            # Where it came from (platform); the full provider item is in raw_json.
            discovery_source=candidate.platform.value,
            raw_json=candidate.raw,
        )
        db.add(row)
        if candidate is result.chosen:
            chosen_row = row

    chapter = await db.get(CourseChapter, chapter_id)
    if chapter is not None:
        if chosen_row is not None:
            await db.flush()  # need chosen_row.id to back-reference
            chapter.chosen_candidate_id = chosen_row.id
            chapter.status = _READY
        else:
            chapter.status = _FAILED
        chapter.progress = _CHAPTER_DONE
    await db.commit()


async def mark_chapter_failed(db: AsyncSession, *, chapter_id: uuid.UUID) -> None:
    chapter = await db.get(CourseChapter, chapter_id)
    if chapter is not None:
        chapter.status = _FAILED
        chapter.progress = _CHAPTER_DONE
        await db.commit()


async def finalize_course(db: AsyncSession, *, course_id: uuid.UUID) -> str:
    """Terminal course state: ready if any chapter is ready, else failed."""
    result = await db.execute(
        select(CourseChapter.status)
        .join(CourseUnit, CourseChapter.unit_id == CourseUnit.id)
        .where(CourseUnit.course_id == course_id)
    )
    statuses = result.scalars().all()
    course = await db.get(Course, course_id)
    if course is None:
        return _FAILED
    course.status = _READY if any(s == _READY for s in statuses) else _FAILED
    await db.commit()
    return course.status
