"""Course persistence, ownership and snapshots. No ai/ calls live here.

Same IDOR red line as conversations/projects: every query that touches a course
by id MUST filter by user_id too — "not yours" and "not there" are both
None -> 404. This module owns the ORM; course_planning_service /
course_build_service orchestrate and delegate persistence here.

树形: course -> module（章）-> lesson（单元）-> point（学习点）. Every ordering
query walks all three levels, so learning order is
module.order_index -> lesson.order_index -> point.order_index.
"""

import uuid
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.course import Course, CourseLesson, CourseModule, CoursePoint
from schemas.course import CourseDetailOut, CourseListItemOut, QuestionnaireOut
from services import progress_service

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
    replaced by the AI course title once compose runs."""
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


async def get_course_detail(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID
) -> CourseDetailOut | None:
    """Owned full snapshot (modules -> lessons -> points eager-loaded). None -> 404.

    The learner's progress is merged onto the points afterwards: it belongs to
    the reader, not to the row, so it can't come out of the eager load.
    """
    result = await db.execute(
        select(Course)
        .where(Course.id == course_id, Course.user_id == user_id)
        .options(
            selectinload(Course.modules)
            .selectinload(CourseModule.lessons)
            .selectinload(CourseLesson.points)
        )
    )
    course = result.scalar_one_or_none()
    if course is None:
        return None
    detail = CourseDetailOut.model_validate(course)
    detail.questionnaire_ready = bool((course.intake_json or {}).get("questionnaire"))

    progress = await progress_service.get_course_point_progress(
        db, user_id=user_id, course_id=course_id
    )
    if progress:
        for module in detail.modules:
            for lesson in module.lessons:
                for point in lesson.points:
                    entry = progress.get(point.id)
                    if entry is None:
                        continue
                    point.completed = entry.completed
                    point.last_position_seconds = entry.last_position_seconds
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


# --- learning order (module -> lesson -> point) ---


def _points_in_course(course_id: uuid.UUID):
    """SELECT over a course's points, joined up to the module for ordering."""
    return (
        select(CoursePoint.id)
        .join(CourseLesson, CoursePoint.lesson_id == CourseLesson.id)
        .join(CourseModule, CourseLesson.module_id == CourseModule.id)
        .where(CourseModule.course_id == course_id)
        .order_by(
            CourseModule.order_index,
            CourseLesson.order_index,
            CoursePoint.order_index,
        )
    )


async def get_ordered_playable_point_ids(
    db: AsyncSession, *, course_id: uuid.UUID
) -> list[uuid.UUID]:
    """Point ids that have a chosen video, in learning order.

    The nearest-preheat order: 'first point' is the head and 'next point' is the
    element after a given id. Points with no chosen candidate (failed research)
    are skipped — they have nothing to download.
    """
    result = await db.execute(
        _points_in_course(course_id).where(CoursePoint.chosen_candidate_id.isnot(None))
    )
    return list(result.scalars())


# --- materialization (物料化门禁) helpers ---


@dataclass
class PointMaterializeContext:
    """The course/user/candidate a point.materialize task needs (one join)."""

    course_id: uuid.UUID
    user_id: uuid.UUID
    candidate_id: uuid.UUID | None


async def load_point_materialize_context(
    db: AsyncSession, *, point_id: uuid.UUID
) -> PointMaterializeContext | None:
    """Resolve a point's course id, owner, and chosen candidate in one query.

    Worker-side (the chord already runs on an authorized course), so no user
    filter — None only when the point is gone.
    """
    row = (
        await db.execute(
            select(Course.id, Course.user_id, CoursePoint.chosen_candidate_id)
            .join(CourseModule, CourseModule.course_id == Course.id)
            .join(CourseLesson, CourseLesson.module_id == CourseModule.id)
            .join(CoursePoint, CoursePoint.lesson_id == CourseLesson.id)
            .where(CoursePoint.id == point_id)
        )
    ).first()
    if row is None:
        return None
    return PointMaterializeContext(
        course_id=row[0], user_id=row[1], candidate_id=row[2]
    )


async def set_point_build_status(
    db: AsyncSession, *, point_id: uuid.UUID, build_status: str
) -> None:
    """Land a point's terminal materialization status."""
    point = await db.get(CoursePoint, point_id)
    if point is None:
        return
    point.build_status = build_status
    await db.commit()


async def get_unfinished_point_ids(
    db: AsyncSession, *, course_id: uuid.UUID
) -> list[uuid.UUID]:
    """Playable points not yet `ready` (failed or still researching), in order —
    the set a materialization retry pass re-runs (ready points are skipped)."""
    result = await db.execute(
        _points_in_course(course_id).where(
            CoursePoint.chosen_candidate_id.isnot(None),
            CoursePoint.build_status != "ready",
        )
    )
    return list(result.scalars())


async def get_materialization_progress(
    db: AsyncSession, *, course_id: uuid.UUID
) -> tuple[int, int, int]:
    """(done, total, failed) counted over the course's points by build_status —
    the DB-truth progress for the materializing SSE + the strict finalize gate."""
    rows = (
        (
            await db.execute(
                select(CoursePoint.build_status)
                .join(CourseLesson, CoursePoint.lesson_id == CourseLesson.id)
                .join(CourseModule, CourseLesson.module_id == CourseModule.id)
                .where(CourseModule.course_id == course_id)
            )
        )
        .scalars()
        .all()
    )
    total = len(rows)
    done = sum(1 for s in rows if s == "ready")
    failed = sum(1 for s in rows if s == "failed")
    return done, total, failed


async def list_courses(
    db: AsyncSession, *, user_id: uuid.UUID, limit: int = 50, offset: int = 0
) -> list[CourseListItemOut]:
    """Only ready courses, newest first (drafts/failed stay hidden).

    Carries each course's learned/total point counts so the course center can
    draw its ring and filter by 进行中/已完成 without a per-card detail fetch.
    """
    result = await db.execute(
        select(Course)
        .where(Course.user_id == user_id, Course.status == _LISTED_STATUS)
        .order_by(Course.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    courses = list(result.scalars())
    counts = await progress_service.get_courses_point_counts(
        db, user_id=user_id, course_ids=[course.id for course in courses]
    )

    items: list[CourseListItemOut] = []
    for course in courses:
        item = CourseListItemOut.model_validate(course)
        entry = counts.get(course.id)
        if entry is not None:
            item.completed_point_count = entry.completed
            item.total_point_count = entry.total
        items.append(item)
    return items


async def delete_course(db: AsyncSession, course: Course) -> None:
    """Delete a course, its tree, and its re-hosted videos.

    The DB cascade reaches modules/lessons/points/candidates/assets and the
    course's companion conversations — but NOT Supabase Storage, which has no
    foreign keys. Dropping the rows first would strand every object, so the
    objects go first (best effort; a failure there must not block the delete).
    """
    from services import video_asset_service

    await video_asset_service.purge_course_objects(db, course_id=course.id)
    await db.delete(course)
    await db.commit()


async def cleanup_stale_drafts(db: AsyncSession, *, before: datetime) -> int:
    """Delete unfinished courses (status != ready) untouched since `before`.

    Drafts abandoned at intake/organizing/materializing and failed runs
    accumulate otherwise. Their Storage objects are purged first (same reason as
    delete_course); the DB then cascades to the tree and candidates. Returns the
    number of courses removed.
    """
    from services import video_asset_service

    stale = (
        (
            await db.execute(
                select(Course.id).where(
                    Course.status != _LISTED_STATUS, Course.updated_at < before
                )
            )
        )
        .scalars()
        .all()
    )
    if not stale:
        return 0
    for course_id in stale:
        await video_asset_service.purge_course_objects(db, course_id=course_id)
    result = await db.execute(delete(Course).where(Course.id.in_(stale)))
    await db.commit()
    return result.rowcount or 0
