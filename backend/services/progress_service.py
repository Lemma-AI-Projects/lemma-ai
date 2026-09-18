"""学习进度: what the learner has actually watched.

Hard line against the generation pipeline: `Course.status` and
`CoursePoint.build_status` say whether the course was BUILT, this module says
whether it was LEARNED. A freshly delivered course is `ready` with every point
at `build_status='ready'` and zero rows here.

Same IDOR rule as the rest of the course domain: every write verifies the point
hangs off a course owned by the caller, and "not yours" and "not there" both
come back as None -> 404.

Percentages are always derived here from point rows, never stored: the course
tree can be rebuilt, and a denormalised rollup would drift from the points it
claims to summarise.
"""

import uuid
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import and_, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from models.course import Course, CourseLesson, CourseModule, CoursePoint
from models.course_point_progress import CoursePointProgress

# A point counts as learned once playback passes this fraction of the video.
# Requiring the final frame would strand every point on outros and credits.
COMPLETION_RATIO = 0.9


@dataclass(frozen=True)
class PointProgress:
    completed: bool
    last_position_seconds: int


@dataclass(frozen=True)
class CoursePointCounts:
    """Course rollup: how many of its points the learner has finished."""

    completed: int
    total: int


async def _point_is_in_owned_course(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    point_id: uuid.UUID,
) -> bool:
    result = await db.execute(
        select(CoursePoint.id)
        .join(CourseLesson, CourseLesson.id == CoursePoint.lesson_id)
        .join(CourseModule, CourseModule.id == CourseLesson.module_id)
        .join(Course, Course.id == CourseModule.course_id)
        .where(
            CoursePoint.id == point_id,
            Course.id == course_id,
            Course.user_id == user_id,
        )
    )
    return result.scalar_one_or_none() is not None


async def report_point_progress(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    point_id: uuid.UUID,
    position_seconds: int,
    duration_seconds: int | None,
) -> PointProgress | None:
    """Record where the learner is in a point's video. None -> 404.

    `completed_at` is monotonic: once a point is finished, scrubbing backwards
    or re-watching can never un-finish it, so the upsert coalesces the stored
    value ahead of the incoming one. A duration is likewise only ever filled in,
    never blanked, since a later report without one says nothing new.
    """
    if not await _point_is_in_owned_course(
        db, user_id=user_id, course_id=course_id, point_id=point_id
    ):
        return None

    position = max(0, position_seconds)
    duration = duration_seconds if duration_seconds and duration_seconds > 0 else None
    # Unknown duration -> unknowable ratio -> the point simply stays unfinished.
    reached_end = duration is not None and position >= duration * COMPLETION_RATIO

    statement = insert(CoursePointProgress).values(
        user_id=user_id,
        point_id=point_id,
        last_position_seconds=position,
        duration_seconds=duration,
        completed_at=func.now() if reached_end else None,
    )
    statement = statement.on_conflict_do_update(
        constraint="uq_course_point_progress_user_id_point_id",
        set_={
            "last_position_seconds": statement.excluded.last_position_seconds,
            "duration_seconds": func.coalesce(
                statement.excluded.duration_seconds,
                CoursePointProgress.duration_seconds,
            ),
            "completed_at": func.coalesce(
                CoursePointProgress.completed_at,
                statement.excluded.completed_at,
            ),
            "updated_at": func.now(),
        },
    ).returning(
        CoursePointProgress.completed_at,
        CoursePointProgress.last_position_seconds,
    )

    row = (await db.execute(statement)).one()
    await db.commit()
    return PointProgress(completed=row[0] is not None, last_position_seconds=row[1])


async def get_course_point_progress(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID
) -> dict[uuid.UUID, PointProgress]:
    """Progress for every touched point of one course, keyed by point id.

    Untouched points are simply absent — the caller defaults them to zero rather
    than this module writing placeholder rows on read.
    """
    result = await db.execute(
        select(
            CoursePointProgress.point_id,
            CoursePointProgress.completed_at,
            CoursePointProgress.last_position_seconds,
        )
        .join(CoursePoint, CoursePoint.id == CoursePointProgress.point_id)
        .join(CourseLesson, CourseLesson.id == CoursePoint.lesson_id)
        .join(CourseModule, CourseModule.id == CourseLesson.module_id)
        .where(
            CourseModule.course_id == course_id,
            CoursePointProgress.user_id == user_id,
        )
    )
    return {
        row[0]: PointProgress(
            completed=row[1] is not None, last_position_seconds=row[2]
        )
        for row in result.all()
    }


async def get_courses_point_counts(
    db: AsyncSession, *, user_id: uuid.UUID, course_ids: list[uuid.UUID]
) -> dict[uuid.UUID, CoursePointCounts]:
    """(completed, total) point counts per course — one pass for a whole list.

    Courses whose tree has no points at all never appear (the join drops them);
    the caller treats a missing entry as 0/0.
    """
    if not course_ids:
        return {}
    result = await db.execute(
        select(
            CourseModule.course_id,
            func.count(CoursePoint.id),
            func.count(CoursePointProgress.completed_at),
        )
        .select_from(CourseModule)
        .join(CourseLesson, CourseLesson.module_id == CourseModule.id)
        .join(CoursePoint, CoursePoint.lesson_id == CourseLesson.id)
        .outerjoin(
            CoursePointProgress,
            and_(
                CoursePointProgress.point_id == CoursePoint.id,
                CoursePointProgress.user_id == user_id,
            ),
        )
        .where(CourseModule.course_id.in_(course_ids))
        .group_by(CourseModule.course_id)
    )
    return {
        row[0]: CoursePointCounts(completed=row[2], total=row[1])
        for row in result.all()
    }


async def list_completions_between(
    db: AsyncSession, *, user_id: uuid.UUID, start: datetime, end: datetime
) -> list[datetime]:
    """Raw completion instants in [start, end), oldest first.

    Deliberately NOT bucketed by day here: "which day" depends on the learner's
    timezone, which the server does not know. A week's worth of instants is tiny,
    so the client buckets them in local time and the server stays tz-agnostic.
    """
    result = await db.execute(
        select(CoursePointProgress.completed_at)
        .where(
            CoursePointProgress.user_id == user_id,
            CoursePointProgress.completed_at >= start,
            CoursePointProgress.completed_at < end,
        )
        .order_by(CoursePointProgress.completed_at)
    )
    return [row[0] for row in result.all()]
