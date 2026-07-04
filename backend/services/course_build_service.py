"""搜索前置 build = organize：把已选定的真实视频组织落库，并接既有视频交付链。

不再按章现搜（搜索已前移到诉求阶段，候选缓存在 course_search_candidates）。这里只做：
读 compose 输入(topic/answers)；把 compose 产出的 ComposedCourseResult **幂等**落成
units/chapters；把每章选中的候选 materialize 成 chapter_video_candidates(is_chosen) 并
回填 chosen_candidate_id —— 交付链(video_asset_service / GET chapter video)零改动。
进度真相仍在 DB；SSE 端读快照。
"""

import uuid

from sqlalchemy import delete, text
from sqlalchemy.ext.asyncio import AsyncSession

from ai.coursegen.types import ComposedCourseResult
from models.course import Course, CourseChapter, CourseUnit
from models.course_candidate import ChapterVideoCandidate

_MATERIALIZING = "materializing"
_READY = "ready"
_FAILED = "failed"
# Units are structural containers; the readiness gate is strictly per-chapter.
_UNIT_READY = "ready"
# Chapters are born in-flight: the materialize chord flips each to ready/failed as
# it pre-generates that chapter's video + overview (材料化门禁).
_CHAPTER_RESEARCHING = "researching"
# chapter_video_candidates.view_count/like_count are int32; a chosen video can
# exceed that (popular YouTube). Clamp on materialize so a hot pick never crashes
# the insert (the pool keeps the true BigInteger value).
_INT32_MAX = 2_147_483_647


def _fit_int32(value: int | None) -> int | None:
    if value is None:
        return None
    return min(value, _INT32_MAX)


async def load_compose_inputs(
    db: AsyncSession, *, course_id: uuid.UUID
) -> tuple[str, dict[str, str]] | None:
    """(topic, answers) for the organize/compose step. None -> course gone.

    Worker-side: course_id was authorized when the API enqueued, so no user
    filter (same convention the old build path used).
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

    Idempotent: clears any existing units first (DB ON DELETE CASCADE wipes
    chapters -> candidates/assets) so a re-run never doubles the tree. Each
    chapter is created `researching` (in-flight) with its chosen candidate written
    as the single chapter_video_candidate (is_chosen) + chosen_candidate_id
    back-filled — exactly the shape video_asset_service reads. The course lands in
    `materializing` (NOT enterable); the chord then pre-generates each chapter's
    video + overview and flips `ready` only when ALL chapters are ready.
    Returns the course status (`materializing` if any chapter, else `failed`).
    """
    course = await db.get(Course, course_id)
    if course is None:
        return _FAILED

    # Clean slate: deleting units cascades (DB FK) to chapters -> candidates/assets.
    await db.execute(delete(CourseUnit).where(CourseUnit.course_id == course_id))
    await db.flush()

    chapter_total = 0
    for unit_index, unit in enumerate(result.units):
        unit_row = CourseUnit(
            course_id=course_id,
            order_index=unit_index,
            title=unit.title,
            status=_UNIT_READY,
        )
        db.add(unit_row)
        await db.flush()  # need unit_row.id for its chapters
        for chapter_index, chapter in enumerate(unit.chapters):
            chapter_row = CourseChapter(
                unit_id=unit_row.id,
                order_index=chapter_index,
                title=chapter.title,
                status=_CHAPTER_RESEARCHING,
                progress=0,
            )
            db.add(chapter_row)
            await db.flush()  # need chapter_row.id for the candidate
            candidate = chapter.candidate
            candidate_row = ChapterVideoCandidate(
                chapter_id=chapter_row.id,
                platform=candidate.platform.value,
                platform_video_id=candidate.platform_video_id,
                url=candidate.url,
                title=candidate.title,
                author=candidate.author,
                author_id=candidate.author_id,
                duration_s=candidate.duration_s,
                view_count=_fit_int32(candidate.view_count),
                like_count=_fit_int32(candidate.like_count),
                thumbnail_url=candidate.thumbnail_url,
                is_chosen=True,
                discovery_source=candidate.platform.value,
                raw_json=candidate.raw,
            )
            db.add(candidate_row)
            await db.flush()  # need candidate_row.id to back-reference
            chapter_row.chosen_candidate_id = candidate_row.id
            chapter_total += 1

    course.title = result.title
    course.status = _MATERIALIZING if chapter_total > 0 else _FAILED
    await db.commit()
    return course.status


# Strict-gate finalize (chord callback). Single conditional UPDATE so concurrent
# finalizes never double-flip and only the winner publishes the terminal event.
_FINALIZE_READY_SQL = text(
    """
    UPDATE courses SET status = 'ready', updated_at = now()
    WHERE id = :course_id AND status = 'materializing'
      AND EXISTS (
        SELECT 1 FROM course_chapters c
        JOIN course_units u ON c.unit_id = u.id
        WHERE u.course_id = :course_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM course_chapters c
        JOIN course_units u ON c.unit_id = u.id
        WHERE u.course_id = :course_id AND c.status <> 'ready'
      )
    RETURNING id
    """
)

_FINALIZE_FAILED_SQL = text(
    """
    UPDATE courses SET status = 'failed', updated_at = now()
    WHERE id = :course_id AND status = 'materializing'
      AND EXISTS (
        SELECT 1 FROM course_chapters c
        JOIN course_units u ON c.unit_id = u.id
        WHERE u.course_id = :course_id AND c.status = 'failed'
      )
    RETURNING id
    """
)


async def finalize_ready(db: AsyncSession, *, course_id: uuid.UUID) -> bool:
    """Strict gate: flip materializing -> ready ONLY when every chapter is ready
    (and >=1 chapter exists). RETURNING -> True for the single winner."""
    result = await db.execute(_FINALIZE_READY_SQL, {"course_id": course_id})
    await db.commit()
    return result.first() is not None


async def finalize_failed(db: AsyncSession, *, course_id: uuid.UUID) -> bool:
    """Flip materializing -> failed when at least one chapter failed (the strict
    gate's negative side). RETURNING -> True for the single winner."""
    result = await db.execute(_FINALIZE_FAILED_SQL, {"course_id": course_id})
    await db.commit()
    return result.first() is not None


# Partial delivery (7-3 拍板): after the retry budget is exhausted, a course
# with AT LEAST ONE ready chapter ships as `ready` instead of burning the whole
# build over a few bad chapters. Requires every chapter terminal (the caller
# force-fails leftovers first) so the flip is race-safe and final; the failed
# chapters keep their per-chapter `failed` status (rendered in-course, and the
# in-course self-heal paths can still revive them lazily).
_FINALIZE_PARTIAL_SQL = text(
    """
    UPDATE courses SET status = 'ready', updated_at = now()
    WHERE id = :course_id AND status = 'materializing'
      AND EXISTS (
        SELECT 1 FROM course_chapters c
        JOIN course_units u ON c.unit_id = u.id
        WHERE u.course_id = :course_id AND c.status = 'ready'
      )
      AND NOT EXISTS (
        SELECT 1 FROM course_chapters c
        JOIN course_units u ON c.unit_id = u.id
        WHERE u.course_id = :course_id
          AND c.status NOT IN ('ready', 'failed')
      )
    RETURNING id
    """
)


async def finalize_partial(db: AsyncSession, *, course_id: uuid.UUID) -> bool:
    """Budget-exhausted gate: flip materializing -> ready when >=1 chapter is
    ready and the rest are terminal. RETURNING -> True for the single winner."""
    result = await db.execute(_FINALIZE_PARTIAL_SQL, {"course_id": course_id})
    await db.commit()
    return result.first() is not None


_FAIL_UNFINISHED_SQL = text(
    """
    UPDATE course_chapters SET status = 'failed'
    WHERE unit_id IN (SELECT id FROM course_units WHERE course_id = :course_id)
      AND status <> 'ready'
    """
)


async def fail_unfinished_chapters(db: AsyncSession, *, course_id: uuid.UUID) -> int:
    """Budget-exhausted finalize: force every non-ready chapter terminal.

    Infra crashes deliberately leave chapters non-terminal (`researching`) so
    the retry chord re-runs them; once retries are exhausted those leftovers
    must be forced to `failed`, otherwise `finalize_failed` (which requires a
    failed chapter to exist) would no-op and the course would hang in
    `materializing` forever. Returns the number of chapters flipped."""
    result = await db.execute(_FAIL_UNFINISHED_SQL, {"course_id": course_id})
    await db.commit()
    return result.rowcount or 0
