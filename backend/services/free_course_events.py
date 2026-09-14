"""Free-Course orchestration: run ai.free_course over SSE and persist as it lands.

Unlike the video pipeline (Celery worker + Redis relay), a free course is built
synchronously inside one request: the browser watches structure appear via the
`step` frames and receives a final `done` (course detail) or `error`. Persistence
is short-lived-session per step because a StreamingResponse must not hold a
Depends(get_db) session for the whole (minutes-long) stream. The same holds for
generating a single lesson on demand once the course exists.

The pipeline never raises through its generator — a failed step yields status
`failed` and we end the stream after landing that failure on the course.
"""

import json
import logging
import uuid
from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy import func, select

from ai.errors import AIError, FreeCourseError
from ai.free_course.blueprint import design_blueprint
from ai.free_course.content import generate_lesson
from ai.free_course.learner_state import BasicLearnerStateProvider
from ai.free_course.pipeline import FreeCourseEvent, FreeCoursePipeline
from ai.free_course.sources import collect_sources, default_sources
from ai.free_course.types import Lesson
from core.database import AsyncSessionLocal
from models.course import Course, CourseChapter, CourseUnit
from models.free_course import CourseLessonObservation, CourseLessonObject
from schemas.free_course import FreeCourseStepEventOut
from services import free_course_service

logger = logging.getLogger("lemma.services.free_course_events")


def to_sse(event: str, data: dict[str, Any]) -> str:
    """Lemma SSE frame (same shape as ai/streaming and course_organize_events)."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def stream_free_course_lesson(
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    chapter_id: uuid.UUID,
    *,
    force: bool = False,
) -> AsyncIterator[str]:
    """Generate one lesson's content on demand.

    A build writes exactly one lesson — the one the path starts at — so every
    other lesson in the map would open empty. This runs the same blueprint ->
    content pair for any lesson in the course and is idempotent: unless `force`
    is set, a lesson that already has content resolves immediately with no model
    call at all.

    Two separate calls rather than one, so the progress block can show the
    writer running: it is the slow step (tens of seconds), and a row that jumps
    straight from pending to done would look like nothing happened.
    """
    async with AsyncSessionLocal() as db:
        course = await free_course_service.get_owned_course_tree(
            db, user_id=user_id, course_id=course_id
        )
        if course is None:
            yield _error("not_found", "课程不存在")
            return
        chapter = next(
            (
                item
                for unit in course.units
                for item in unit.chapters
                if item.id == chapter_id
            ),
            None,
        )
        if chapter is None:
            yield _error("not_found", "这节课不存在")
            return
        existing = await free_course_service.count_objects(db, chapter_id=chapter_id)
        learning_map = free_course_service.map_from_tree(course)
        intent = free_course_service.intent_from_course(course)
        step = free_course_service.step_for_chapter(course, chapter)

    if existing > 0 and not force:
        # Already generated: hand back the stored lesson, no model call.
        content = await _read_lesson(user_id, course_id, chapter_id)
        if content is None:
            yield _error("not_found", "这节课不存在")
            return
        yield to_sse("done", content)
        return

    observed = await _observed_attempts(user_id=user_id, course_id=course_id)
    learner_state = await BasicLearnerStateProvider(
        observed_attempts=observed
    ).get(user_id=str(user_id), intent=intent)
    material = await collect_sources(intent, default_sources())

    yield to_sse(
        "step",
        FreeCourseStepEventOut(step="blueprint", status="started").model_dump(
            by_alias=True, mode="json"
        ),
    )
    try:
        blueprint = await design_blueprint(
            learning_map, step, learner_state=learner_state, user_id=str(user_id)
        )
    except (FreeCourseError, AIError) as exc:
        yield _error(getattr(exc, "code", "free_course_error"), str(exc))
        return
    yield to_sse(
        "step",
        FreeCourseStepEventOut(
            step="blueprint",
            status="finished",
            detail=f"{len(blueprint.sequence)} 个教学环节",
        ).model_dump(by_alias=True, mode="json"),
    )

    yield to_sse(
        "step",
        FreeCourseStepEventOut(step="content", status="started").model_dump(
            by_alias=True, mode="json"
        ),
    )
    try:
        lesson = await generate_lesson(
            blueprint, material=material, user_id=str(user_id)
        )
    except (FreeCourseError, AIError) as exc:
        yield _error(getattr(exc, "code", "free_course_error"), str(exc))
        return
    yield to_sse(
        "step",
        FreeCourseStepEventOut(
            step="content",
            status="finished",
            detail=_content_summary(lesson),
        ).model_dump(by_alias=True, mode="json"),
    )

    try:
        async with AsyncSessionLocal() as db:
            stored = await db.get(CourseChapter, chapter_id)
            if stored is None:
                yield _error("not_found", "这节课已不存在")
                return
            await free_course_service.persist_blueprint(
                db, stored, blueprint.model_dump(mode="json")
            )
            await free_course_service.persist_lesson(db, stored, lesson)
    except Exception:  # noqa: BLE001 — a storage failure must end loudly
        logger.exception("free-course lesson persist failed for %s", chapter_id)
        yield _error("persist_failed", "课程数据保存失败")
        return

    content = await _read_lesson(user_id, course_id, chapter_id)
    if content is None:
        yield _error("not_found", "这节课已不存在")
        return
    yield to_sse("done", content)


async def _read_lesson(
    user_id: uuid.UUID, course_id: uuid.UUID, chapter_id: uuid.UUID
) -> dict[str, Any] | None:
    """The lesson in wire shape, read back through the same path the GET uses.

    Reading back rather than serialising the in-memory lesson keeps one
    definition of what a lesson looks like on the wire (and keeps the grading
    facts server-side).
    """
    async with AsyncSessionLocal() as db:
        content = await free_course_service.get_lesson_content(
            db, user_id=user_id, course_id=course_id, chapter_id=chapter_id
        )
    if content is None:
        return None
    return content.model_dump(by_alias=True, mode="json")


def _content_summary(lesson: Lesson) -> str:
    kinds: dict[str, int] = {}
    for obj in lesson.objects:
        kinds[obj.kind] = kinds.get(obj.kind, 0) + 1
    return " · ".join(f"{kind} {count}" for kind, count in kinds.items())


def _error(code: str, message: str) -> str:
    return to_sse("error", {"code": code, "message": message})


async def stream_free_course_build(
    user_id: uuid.UUID, course_id: uuid.UUID, request: str
) -> AsyncIterator[str]:
    observed = await _observed_attempts(user_id=user_id, course_id=course_id)
    pipeline = FreeCoursePipeline(
        learner_state_provider=BasicLearnerStateProvider(observed_attempts=observed)
    )
    target_chapter_id: uuid.UUID | None = None

    async for step in pipeline.stream(request, user_id=str(user_id)):
        if step.status == "started":
            yield to_sse("step", _frame(step).model_dump(by_alias=True, mode="json"))
            continue
        try:
            async with AsyncSessionLocal() as db:
                target_chapter_id = await _persist_step(
                    db, course_id=course_id, step=step,
                    pipeline=pipeline, target_chapter_id=target_chapter_id,
                )
        except Exception:  # noqa: BLE001 — a storage failure must end loudly
            logger.exception("free-course persist failed for %s", course_id)
            await _mark_failed(course_id)
            yield to_sse(
                "error",
                {"code": "persist_failed", "message": "课程数据保存失败"},
            )
            return
        if step.status == "failed":
            await _mark_failed(course_id)
            yield to_sse(
                "error",
                {
                    "code": step.error_code or "free_course_failed",
                    "message": step.error_message or "生成课程失败",
                },
            )
            return
        yield to_sse("step", _frame(step).model_dump(by_alias=True, mode="json"))

    async with AsyncSessionLocal() as db:
        detail = await free_course_service.get_detail(
            db, user_id=user_id, course_id=course_id
        )
    if detail is not None:
        yield to_sse("done", detail.model_dump(by_alias=True, mode="json"))


def _frame(step: FreeCourseEvent) -> FreeCourseStepEventOut:
    return FreeCourseStepEventOut(
        step=step.step,
        status=step.status,
        detail=step.detail,
        payload=step.payload,
        error_code=step.error_code,
        error_message=step.error_message,
    )


async def _persist_step(
    db, *, course_id: uuid.UUID, step: FreeCourseEvent,
    pipeline: FreeCoursePipeline, target_chapter_id: uuid.UUID | None,
) -> uuid.UUID | None:
    course = await db.get(Course, course_id)
    if course is None:
        return target_chapter_id

    if step.status == "failed":
        await free_course_service.finalize_course(
            db, course_id=course_id, status="failed"
        )
        return target_chapter_id

    if step.step == "intent" and step.status == "finished":
        await free_course_service.persist_intent(db, course, step.payload)
    elif step.step == "map" and step.status == "finished":
        await free_course_service.persist_map(db, course, step.payload)
    elif step.step == "blueprint" and step.status == "finished":
        unit_title = (step.payload or {}).get("unit_title")
        lesson_title = (step.payload or {}).get("lesson_title")
        chapter = await free_course_service.find_lesson_chapter(
            db, course_id=course_id, unit_title=unit_title, lesson_title=lesson_title
        )
        if chapter is not None:
            await free_course_service.persist_blueprint(db, chapter, step.payload)
            target_chapter_id = chapter.id
    elif step.step == "content" and step.status == "finished":
        if target_chapter_id is not None and pipeline.lesson is not None:
            chapter = await db.get(CourseChapter, target_chapter_id)
            if chapter is not None:
                await free_course_service.persist_lesson(db, chapter, pipeline.lesson)
    elif step.step == "done" and step.status == "finished":
        await free_course_service.finalize_course(
            db, course_id=course_id, status="ready"
        )
    return target_chapter_id


async def _mark_failed(course_id: uuid.UUID) -> None:
    try:
        async with AsyncSessionLocal() as db:
            await free_course_service.finalize_course(
                db, course_id=course_id, status="failed"
            )
    except Exception:  # noqa: BLE001 — best-effort on the error path
        logger.exception("marking free course %s failed errored", course_id)


async def _observed_attempts(
    *, user_id: uuid.UUID, course_id: uuid.UUID
) -> int:
    """Observations produced in this course so far — the MVP learner signal."""
    async with AsyncSessionLocal() as db:
        count = (
            await db.execute(
                select(func.count(CourseLessonObservation.id))
                .join(
                    CourseLessonObject,
                    CourseLessonObservation.object_id == CourseLessonObject.id,
                )
                .join(CourseChapter, CourseLessonObject.chapter_id == CourseChapter.id)
                .join(CourseUnit, CourseChapter.unit_id == CourseUnit.id)
                .where(CourseUnit.course_id == course_id)
            )
        ).scalar_one()
    return int(count or 0)