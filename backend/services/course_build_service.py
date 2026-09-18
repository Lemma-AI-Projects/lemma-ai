"""搜索前置 build = organize：把已选定的真实视频组织落库，并接既有视频交付链。

不再按点现搜（搜索已前移到诉求阶段，候选缓存在 course_search_candidates）。这里只做：
读 compose 输入(topic/answers)；把 compose 产出的 ComposedCourseResult **幂等**落成
modules/lessons/points；把每个学习点选中的候选 materialize 成 point_video_candidates
(is_chosen) 并回填 chosen_candidate_id —— 交付链(video_asset_service / GET point video)
零改动。进度真相仍在 DB；SSE 端读快照。
"""

import uuid

from sqlalchemy import delete, text
from sqlalchemy.ext.asyncio import AsyncSession

from ai.coursegen.types import ComposedCourseResult
from models.course import Course, CourseLesson, CourseModule, CoursePoint
from models.point_video_candidate import PointVideoCandidate

_MATERIALIZING = "materializing"
_FAILED = "failed"
# Points are born in-flight: the materialize chord flips each to ready/failed as
# it downloads that point's video (物料化门禁).
_POINT_RESEARCHING = "researching"


async def load_compose_inputs(
    db: AsyncSession, *, course_id: uuid.UUID
) -> tuple[str, dict[str, str]] | None:
    """(topic, answers) for the organize/compose step. None -> course gone.

    Worker-side: course_id was authorized when the API enqueued, so no user
    filter.
    """
    course = await db.get(Course, course_id)
    if course is None:
        return None
    answers: dict[str, str] = {}
    if course.intake_json:
        answers = course.intake_json.get("answers") or {}
    return course.topic, answers


async def mark_failed(db: AsyncSession, *, course_id: uuid.UUID) -> None:
    """Terminal failure for organize (no candidates / search failed / compose
    produced nothing valid). Reuses the existing `failed` state."""
    course = await db.get(Course, course_id)
    if course is not None:
        course.status = _FAILED
        await db.commit()


async def persist_composed_course(
    db: AsyncSession, *, course_id: uuid.UUID, result: ComposedCourseResult
) -> str:
    """Land the validated composed course and enter the materialization phase.

    Idempotent: clears any existing modules first (DB ON DELETE CASCADE wipes
    lessons -> points -> candidates/assets) so a re-run never doubles the tree.
    Each point is created `researching` (in-flight) with its chosen candidate
    written as the single point_video_candidate (is_chosen) + chosen_candidate_id
    back-filled — exactly the shape video_asset_service reads. The course lands
    in `materializing` (NOT enterable); the chord then downloads each point's
    video and flips `ready` only when they are all ready.
    Returns the course status (`materializing` if any point, else `failed`).
    """
    course = await db.get(Course, course_id)
    if course is None:
        return _FAILED

    # Clean slate: deleting modules cascades (DB FK) down to points/candidates.
    await db.execute(
        delete(CourseModule).where(CourseModule.course_id == course_id)
    )
    await db.flush()

    point_total = 0
    for module_index, module in enumerate(result.modules):
        module_row = CourseModule(
            course_id=course_id,
            order_index=module_index,
            title=module.title,
            summary=module.summary or None,
        )
        db.add(module_row)
        await db.flush()  # need module_row.id for its lessons
        for lesson_index, lesson in enumerate(module.lessons):
            lesson_row = CourseLesson(
                module_id=module_row.id,
                order_index=lesson_index,
                title=lesson.title,
                summary=lesson.summary or None,
            )
            db.add(lesson_row)
            await db.flush()  # need lesson_row.id for its points
            for point_index, point in enumerate(lesson.points):
                point_row = CoursePoint(
                    lesson_id=lesson_row.id,
                    order_index=point_index,
                    title=point.title,
                    build_status=_POINT_RESEARCHING,
                )
                db.add(point_row)
                await db.flush()  # need point_row.id for the candidate
                candidate = point.candidate
                candidate_row = PointVideoCandidate(
                    point_id=point_row.id,
                    platform=candidate.platform.value,
                    platform_video_id=candidate.platform_video_id,
                    url=candidate.url,
                    title=candidate.title,
                    author=candidate.author,
                    author_id=candidate.author_id,
                    duration_s=candidate.duration_s,
                    view_count=candidate.view_count,
                    like_count=candidate.like_count,
                    thumbnail_url=candidate.thumbnail_url,
                    is_chosen=True,
                    discovery_source=candidate.platform.value,
                    raw_json=candidate.raw,
                )
                db.add(candidate_row)
                await db.flush()  # need candidate_row.id to back-reference
                point_row.chosen_candidate_id = candidate_row.id
                point_total += 1

    course.title = result.title
    course.description = result.description or None
    course.status = _MATERIALIZING if point_total > 0 else _FAILED
    await db.commit()
    return course.status


# Every finalize gate walks course -> modules -> lessons -> points, so the
# join is spelled once here and interpolated into the conditional UPDATEs.
_POINTS_OF_COURSE = """
        FROM course_points p
        JOIN course_lessons l ON p.lesson_id = l.id
        JOIN course_modules m ON l.module_id = m.id
        WHERE m.course_id = :course_id
"""

# Strict-gate finalize (chord callback). Single conditional UPDATE so concurrent
# finalizes never double-flip and only the winner publishes the terminal event.
_FINALIZE_READY_SQL = text(
    f"""
    UPDATE courses SET status = 'ready', updated_at = now()
    WHERE id = :course_id AND status = 'materializing'
      AND EXISTS (SELECT 1 {_POINTS_OF_COURSE})
      AND NOT EXISTS (
        SELECT 1 {_POINTS_OF_COURSE} AND p.build_status <> 'ready'
      )
    RETURNING id
    """
)

_FINALIZE_FAILED_SQL = text(
    f"""
    UPDATE courses SET status = 'failed', updated_at = now()
    WHERE id = :course_id AND status = 'materializing'
      AND EXISTS (
        SELECT 1 {_POINTS_OF_COURSE} AND p.build_status = 'failed'
      )
    RETURNING id
    """
)


async def finalize_ready(db: AsyncSession, *, course_id: uuid.UUID) -> bool:
    """Strict gate: flip materializing -> ready ONLY when every point is ready
    (and >=1 point exists). RETURNING -> True for the single winner."""
    result = await db.execute(_FINALIZE_READY_SQL, {"course_id": course_id})
    await db.commit()
    return result.first() is not None


async def finalize_failed(db: AsyncSession, *, course_id: uuid.UUID) -> bool:
    """Flip materializing -> failed when at least one point failed (the strict
    gate's negative side). RETURNING -> True for the single winner."""
    result = await db.execute(_FINALIZE_FAILED_SQL, {"course_id": course_id})
    await db.commit()
    return result.first() is not None


# Partial delivery (7-3 拍板): after the retry budget is exhausted, a course
# with AT LEAST ONE ready point ships as `ready` instead of burning the whole
# build over a few bad videos. Requires every point terminal (the caller
# force-fails leftovers first) so the flip is race-safe and final; the failed
# points keep their per-point `failed` status (rendered in-course, and the
# in-course self-heal paths can still revive them lazily).
_FINALIZE_PARTIAL_SQL = text(
    f"""
    UPDATE courses SET status = 'ready', updated_at = now()
    WHERE id = :course_id AND status = 'materializing'
      AND EXISTS (
        SELECT 1 {_POINTS_OF_COURSE} AND p.build_status = 'ready'
      )
      AND NOT EXISTS (
        SELECT 1 {_POINTS_OF_COURSE}
          AND p.build_status NOT IN ('ready', 'failed')
      )
    RETURNING id
    """
)


async def finalize_partial(db: AsyncSession, *, course_id: uuid.UUID) -> bool:
    """Budget-exhausted gate: flip materializing -> ready when >=1 point is
    ready and the rest are terminal. RETURNING -> True for the single winner."""
    result = await db.execute(_FINALIZE_PARTIAL_SQL, {"course_id": course_id})
    await db.commit()
    return result.first() is not None


_FAIL_UNFINISHED_SQL = text(
    """
    UPDATE course_points SET build_status = 'failed'
    WHERE lesson_id IN (
        SELECT l.id FROM course_lessons l
        JOIN course_modules m ON l.module_id = m.id
        WHERE m.course_id = :course_id
    )
      AND build_status <> 'ready'
    """
)


async def fail_unfinished_points(db: AsyncSession, *, course_id: uuid.UUID) -> int:
    """Budget-exhausted finalize: force every non-ready point terminal.

    Infra crashes deliberately leave points non-terminal (`researching`) so
    the retry chord re-runs them; once retries are exhausted those leftovers
    must be forced to `failed`, otherwise `finalize_failed` (which requires a
    failed point to exist) would no-op and the course would hang in
    `materializing` forever. Returns the number of points flipped."""
    result = await db.execute(_FAIL_UNFINISHED_SQL, {"course_id": course_id})
    await db.commit()
    return result.rowcount or 0
