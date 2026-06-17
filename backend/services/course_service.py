"""Course persistence, ownership and snapshots. No ai/ calls live here.

Same IDOR red line as conversations/projects: every query that touches a course
by id MUST filter by user_id too — "not yours" and "not there" are both
None -> 404. This module owns the ORM; course_planning_service / the future
build service orchestrate and delegate persistence here.
"""

import uuid
from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ai.coursegen.types import CourseOutline
from models.course import Course, CourseChapter, CourseUnit
from schemas.course import CourseDetailOut

# Only fully-built courses appear in the list (拍板: status < ready stay hidden,
# failed drafts too). Everything below this is a draft swept by cleanup.
_LISTED_STATUS = "ready"


async def create_course(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    topic: str,
    conversation_id: uuid.UUID | None,
    intake_json: dict | None,
) -> Course:
    """Create a course in the `intake` state. title starts as the topic and is
    replaced by the AI course title once the outline is generated."""
    course = Course(
        user_id=user_id,
        topic=topic,
        title=topic,
        status="intake",
        conversation_id=conversation_id,
        intake_json=intake_json,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


async def get_owned_course(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID
) -> Course | None:
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def persist_outline(
    db: AsyncSession,
    course: Course,
    outline: CourseOutline,
    *,
    intake_json: dict | None,
) -> None:
    """Lay the AI outline down as unit/chapter rows and advance to outline_ready.

    order_index is assigned from list position (the wire never exposes it). DB
    fields the brain doesn't produce (id/status/progress) are set here; the
    chapter `summary` from the outline is stored on the row.
    """
    course.title = outline.title
    course.intake_json = intake_json
    course.status = "outline_ready"
    for unit_index, outline_unit in enumerate(outline.units):
        unit = CourseUnit(
            course_id=course.id,
            order_index=unit_index,
            title=outline_unit.title,
            status="not_started",
        )
        db.add(unit)
        await db.flush()  # need unit.id for its chapters
        for chapter_index, outline_chapter in enumerate(outline_unit.chapters):
            db.add(
                CourseChapter(
                    unit_id=unit.id,
                    order_index=chapter_index,
                    title=outline_chapter.title,
                    summary=outline_chapter.summary,
                    status="not_started",
                )
            )
    await db.commit()


async def get_course_detail(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID
) -> CourseDetailOut | None:
    """Owned full snapshot (units -> chapters eager-loaded). None -> 404."""
    result = await db.execute(
        select(Course)
        .where(Course.id == course_id, Course.user_id == user_id)
        .options(selectinload(Course.units).selectinload(CourseUnit.chapters))
    )
    course = result.scalar_one_or_none()
    if course is None:
        return None
    detail = CourseDetailOut.model_validate(course)
    _apply_progress(detail)
    return detail


def _apply_progress(detail: CourseDetailOut) -> None:
    """Roll chapter progress up to unit and course (已完成章节占比).

    Chapter progress is stored (0 until researched, 100 at terminal ready/
    failed); unit/course progress are derived here for the snapshot. Build
    progress therefore rises monotonically and hits 100 once every chapter is
    terminal.
    """
    all_chapters = [chapter for unit in detail.units for chapter in unit.chapters]
    for unit in detail.units:
        if unit.chapters:
            unit.progress = round(
                sum(c.progress for c in unit.chapters) / len(unit.chapters)
            )
    if all_chapters:
        detail.progress = round(
            sum(c.progress for c in all_chapters) / len(all_chapters)
        )


async def list_courses(
    db: AsyncSession, *, user_id: uuid.UUID, limit: int = 50, offset: int = 0
) -> list[Course]:
    """Only ready courses, newest first (drafts/failed stay hidden)."""
    result = await db.execute(
        select(Course)
        .where(Course.user_id == user_id, Course.status == _LISTED_STATUS)
        .order_by(Course.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars())


async def delete_course(db: AsyncSession, course: Course) -> None:
    # units/chapters/candidates go with it (FK ON DELETE CASCADE).
    await db.delete(course)
    await db.commit()


async def cleanup_stale_drafts(db: AsyncSession, *, before: datetime) -> int:
    """Delete unfinished courses (status != ready) untouched since `before`.

    Drafts abandoned at intake/outline_ready/building and failed runs accumulate
    otherwise. Bulk delete; the DB cascades to units/chapters/candidates.
    Returns the number of courses removed.
    """
    result = await db.execute(
        delete(Course).where(
            Course.status != _LISTED_STATUS, Course.updated_at < before
        )
    )
    await db.commit()
    return result.rowcount or 0
