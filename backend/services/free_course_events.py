"""Free-Course build orchestration: run ai.free_course over SSE and persist as it lands.

Unlike the video pipeline (Celery worker + Redis relay), a free course is built
synchronously inside one request: the browser watches structure appear via the
`step` frames and receives a final `done` (course detail) or `error`. Persistence
is short-lived-session per step because a StreamingResponse must not hold a
Depends(get_db) session for the whole (minutes-long) stream.

The pipeline never raises through its generator — a failed step yields status
`failed` and we end the stream after landing that failure on the course.
"""

import json
import logging
import uuid
from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy import func, select

from ai.free_course.learner_state import BasicLearnerStateProvider
from ai.free_course.pipeline import FreeCourseEvent, FreeCoursePipeline
from core.database import AsyncSessionLocal
from models.course import Course, CourseChapter, CourseUnit
from models.free_course import CourseLessonObservation, CourseLessonObject
from schemas.free_course import FreeCourseStepEventOut
from services import free_course_service

logger = logging.getLogger("lemma.services.free_course_events")


def to_sse(event: str, data: dict[str, Any]) -> str:
    """Lemma SSE frame (same shape as ai/streaming and course_organize_events)."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


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