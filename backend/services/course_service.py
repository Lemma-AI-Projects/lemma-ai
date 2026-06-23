"""Course persistence, ownership and snapshots. No ai/ calls live here.

Same IDOR red line as conversations/projects: every query that touches a course
by id MUST filter by user_id too — "not yours" and "not there" are both
None -> 404. This module owns the ORM; course_planning_service / the future
build service orchestrate and delegate persistence here.
"""

import uuid
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ai.coursegen.types import CourseOutline
from models.course import Course, CourseChapter, CourseUnit
from schemas.course import CourseDetailOut, QuestionnaireOut

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
    detail.questionnaire_ready = bool((course.intake_json or {}).get("questionnaire"))
    _apply_progress(detail)
    return detail


async def get_questionnaire(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID
) -> QuestionnaireOut | None:
    """The intake questionnaire for an owned course (stored in intake_json).

    Lets the in-conversation tool card hydrate the questionnaire stage from just
    a courseId — the same path live and on history reload.

    Returns an EMPTY questionnaire (not None) when the course is owned but its
    questionnaire is still being generated in the background, so the card can
    poll until it's ready. None means 404 (not owned / gone) only.
    """
    course = await get_owned_course(db, user_id=user_id, course_id=course_id)
    if course is None:
        return None
    data = (course.intake_json or {}).get("questionnaire")
    if not data:
        return QuestionnaireOut(questions=[])
    return QuestionnaireOut.model_validate(data)


async def store_questionnaire(
    db: AsyncSession, *, course_id: uuid.UUID, questionnaire: dict
) -> None:
    """Fill a freshly generated questionnaire onto an existing intake course.

    The course shell is created first (id available immediately); this lands the
    questionnaire once the background LLM call finishes. Reassigns intake_json (a
    new dict) so SQLAlchemy flags the JSONB column dirty. No-op if the course is
    gone (deleted mid-generation)."""
    course = await db.get(Course, course_id)
    if course is not None:
        course.intake_json = {
            **(course.intake_json or {}),
            "questionnaire": questionnaire,
        }
        await db.commit()


async def mark_intake_failed(db: AsyncSession, *, course_id: uuid.UUID) -> None:
    """Questionnaire generation failed -> move the intake course to failed.

    Lets the in-conversation card stop polling and show the failure instead of an
    endless skeleton. Guarded on `intake` so it never clobbers a course that has
    already advanced."""
    course = await db.get(Course, course_id)
    if course is not None and course.status == "intake":
        course.status = "failed"
        await db.commit()


def _apply_progress(detail: CourseDetailOut) -> None:
    """Roll chapter progress up to unit and course (章节进度的平均值).

    Chapter progress moves through in-flight beats (搜索 25 / 排序 50 / 选片 75)
    and reaches 100 only at a terminal write (ready/failed); unit and course
    progress are the average of their chapters, derived here for the snapshot.
    Build progress therefore rises smoothly and hits 100 once every chapter is
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


async def get_ordered_playable_chapter_ids(
    db: AsyncSession, *, course_id: uuid.UUID
) -> list[uuid.UUID]:
    """Chapter ids that have a chosen video, in learning order (unit→chapter).

    The nearest-preheat order: 'first chapter' is the head and 'next chapter' is
    the element after a given id. Chapters with no chosen candidate (failed
    research) are skipped — they have nothing to download.
    """
    result = await db.execute(
        select(CourseChapter.id)
        .join(CourseUnit, CourseChapter.unit_id == CourseUnit.id)
        .where(
            CourseUnit.course_id == course_id,
            CourseChapter.chosen_candidate_id.isnot(None),
        )
        .order_by(CourseUnit.order_index, CourseChapter.order_index)
    )
    return list(result.scalars())


async def get_first_playable_chapter_id(
    db: AsyncSession, *, course_id: uuid.UUID
) -> uuid.UUID | None:
    """The chapter to pre-warm right after a build finishes (拍板: 先下第一章)."""
    ids = await get_ordered_playable_chapter_ids(db, course_id=course_id)
    return ids[0] if ids else None


# --- materialization (物料化门禁) helpers ---


@dataclass
class ChapterMaterializeContext:
    """The course/user/candidate a chapter.materialize task needs (one join)."""

    course_id: uuid.UUID
    user_id: uuid.UUID
    candidate_id: uuid.UUID | None


async def load_chapter_materialize_context(
    db: AsyncSession, *, chapter_id: uuid.UUID
) -> ChapterMaterializeContext | None:
    """Resolve a chapter's course id, owner, and chosen candidate in one query.

    Worker-side (the chord already runs on an authorized course), so no user
    filter — None only when the chapter is gone.
    """
    row = (
        await db.execute(
            select(
                Course.id, Course.user_id, CourseChapter.chosen_candidate_id
            )
            .join(CourseUnit, CourseUnit.course_id == Course.id)
            .join(CourseChapter, CourseChapter.unit_id == CourseUnit.id)
            .where(CourseChapter.id == chapter_id)
        )
    ).first()
    if row is None:
        return None
    return ChapterMaterializeContext(
        course_id=row[0], user_id=row[1], candidate_id=row[2]
    )


async def set_chapter_status(
    db: AsyncSession, *, chapter_id: uuid.UUID, status: str
) -> None:
    """Land a chapter's terminal materialization status (ready -> progress 100)."""
    chapter = await db.get(CourseChapter, chapter_id)
    if chapter is None:
        return
    chapter.status = status
    if status == "ready":
        chapter.progress = 100
    await db.commit()


async def get_materialization_progress(
    db: AsyncSession, *, course_id: uuid.UUID
) -> tuple[int, int, int]:
    """(done, total, failed) counted over the course's chapters by status — the
    DB-truth progress for the materializing SSE + the strict finalize gate."""
    rows = (
        await db.execute(
            select(CourseChapter.status)
            .join(CourseUnit, CourseChapter.unit_id == CourseUnit.id)
            .where(CourseUnit.course_id == course_id)
        )
    ).scalars().all()
    total = len(rows)
    done = sum(1 for s in rows if s == "ready")
    failed = sum(1 for s in rows if s == "failed")
    return done, total, failed


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
