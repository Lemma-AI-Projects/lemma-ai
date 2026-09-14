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
from ai.free_course.path import assess_gap, build_path
from ai.free_course.persona import PromptInferredPersonaProvider
from ai.free_course.pipeline import FreeCourseEvent, FreeCoursePipeline
from ai.free_course.sources import collect_sources, default_sources
from ai.free_course.types import Lesson
from core.database import AsyncSessionLocal
from models.course import Course, CourseChapter, CourseUnit
from models.free_course import CourseLessonObservation, CourseLessonObject
from schemas.free_course import (
    CourseTuningOptionOut,
    CourseTuningQuestionOut,
    CourseTuningStartOut,
    FreeCourseStepEventOut,
)
from services import free_course_service

logger = logging.getLogger("lemma.services.free_course_events")

# One shared infer-by-prompt stub for the whole build. It consumes only the
# intent (never writes), so swapping in a real persona provider later is a
# one-line change with zero impact on the events layer.
_persona_provider = PromptInferredPersonaProvider()


def to_sse(event: str, data: dict[str, Any]) -> str:
    """Lemma SSE frame (same shape as ai/streaming and course_organize_events)."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


# The pre-blueprint questionnaire: how the learner tunes this one course's
# volume/depth/focus/pace. Labels are Chinese here; the frontend swaps them via
# i18n. Values are the UserProfile dims phase 2 merges over the inferred persona.
_QUESTION_SET = [
    CourseTuningQuestionOut(
        key="course_volume",
        title="课程体量",
        options=[
            CourseTuningOptionOut(value="quick_scan", label="快速扫描"),
            CourseTuningOptionOut(value="standard", label="标准"),
            CourseTuningOptionOut(value="systematic", label="系统深入"),
        ],
    ),
    CourseTuningQuestionOut(
        key="depth",
        title="讲解深度",
        options=[
            CourseTuningOptionOut(value="intuition", label="直觉理解"),
            CourseTuningOptionOut(value="derivation", label="推导细节"),
            CourseTuningOptionOut(value="advanced", label="进阶深入"),
        ],
    ),
    CourseTuningQuestionOut(
        key="focus",
        title="内容侧重",
        options=[
            CourseTuningOptionOut(value="concepts", label="概念"),
            CourseTuningOptionOut(value="examples", label="实例"),
            CourseTuningOptionOut(value="applied", label="应用"),
            CourseTuningOptionOut(value="theory", label="理论"),
        ],
    ),
    CourseTuningQuestionOut(
        key="pace",
        title="学习节奏",
        options=[
            CourseTuningOptionOut(value="relaxed", label="宽松"),
            CourseTuningOptionOut(value="moderate", label="适中"),
            CourseTuningOptionOut(value="intensive", label="紧凑"),
        ],
    ),
]


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
    """Run the build, asking the questionnaire exactly when it is needed.

    A course has two build phases split by the pre-blueprint questionnaire.
    Until its answer is stored (``course.tuning_json``), phase 1 derives
    ``intent -> map -> path`` then stops to ask. Once an answer lands, phase 2
    resumes from the persisted map: it merges the tuning over the inferred persona
    and runs ``blueprint -> content`` to a finished course.
    """
    async with AsyncSessionLocal() as db:
        tuning = await free_course_service.get_course_tuning(
            db, course_id=course_id, user_id=user_id
        )
    if tuning is None:
        async for frame in _stream_build_phase1(user_id, course_id, request):
            yield frame
    else:
        async for frame in _stream_build_phase2(user_id, course_id):
            yield frame


async def _stream_build_phase1(
    user_id: uuid.UUID, course_id: uuid.UUID, request: str
) -> AsyncIterator[str]:
    """Phase 1: ''intent -> map -> path'', then ask the questionnaire.

    The pipeline runs with ``stop_at="path"`` so nothing after the path executes:
    intent/map persist as they land, then instead of a ``done`` the stream emits a
    ``questionnaire`` frame and ends. The course stays ``building`` on purpose —
    the learner's answer decides how phase 2 writes it.
    """
    observed = await _observed_attempts(user_id=user_id, course_id=course_id)
    pipeline = FreeCoursePipeline(
        learner_state_provider=BasicLearnerStateProvider(observed_attempts=observed),
        stop_at="path",
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

    # Path reached and the pipeline stopped cleanly: its intent is populated, so
    # the questionnaire can present the inferred defaults. No `done` here.
    if pipeline.intent is None:
        yield _error("free_course_failed", "课程意图解析失败")
        return
    profile = await _persona_provider.get(
        user_id=str(user_id), intent=pipeline.intent
    )
    yield to_sse(
        "questionnaire",
        CourseTuningStartOut(
            defaults=profile.model_dump(by_alias=True, mode="json"),
            questions=_QUESTION_SET,
        ).model_dump(by_alias=True, mode="json"),
    )


async def _stream_build_phase2(
    user_id: uuid.UUID, course_id: uuid.UUID
) -> AsyncIterator[str]:
    """Phase 2: ''blueprint -> content'' for the starting lesson, then finish.

    Runs the same model pair as a lesson generation, but after the questionnaire:
    the stored tuning is merged over the inferred persona so the learner's choices
    reach the writing prompts. The starting lesson is located the same way the
    full build did it — assess the gap, build the path, take ``next_lesson_title``.
    Any listed-regeneration path (editing) lives in the C phase, not here.
    """
    async with AsyncSessionLocal() as db:
        course = await free_course_service.get_owned_course_tree(
            db, user_id=user_id, course_id=course_id
        )
        if course is None:
            yield _error("not_found", "课程不存在")
            return
        tuning_dims = course.tuning_json or {}
        learning_map = free_course_service.map_from_tree(course)
        intent = free_course_service.intent_from_course(course)

    observed = await _observed_attempts(user_id=user_id, course_id=course_id)
    learner_state = await BasicLearnerStateProvider(
        observed_attempts=observed
    ).get(user_id=str(user_id), intent=intent)
    profile = await _persona_provider.get(user_id=str(user_id), intent=intent)
    if tuning_dims:
        overrides = {
            key: tuning_dims[key]
            for key in ("course_volume", "depth", "focus", "pace")
            if tuning_dims.get(key)
        }
        if overrides:
            profile = profile.model_copy(update=overrides)
    material = await collect_sources(intent, default_sources())

    gap = await assess_gap(
        learning_map, learner_state=learner_state, user_id=str(user_id)
    )
    path = build_path(learning_map, gap, intent=intent)
    if path.next_lesson_title is None:
        yield _error("free_course_error", "path has no lesson to start from")
        return
    chapter = next(
        (
            item
            for unit in course.units
            for item in unit.chapters
            if item.title == path.next_lesson_title
        ),
        None,
    )
    if chapter is None:
        yield _error("free_course_error", "path.next_lesson_title is not a map lesson")
        return
    step = free_course_service.step_for_chapter(course, chapter)

    yield to_sse(
        "step",
        FreeCourseStepEventOut(step="blueprint", status="started").model_dump(
            by_alias=True, mode="json"
        ),
    )
    try:
        blueprint = await design_blueprint(
            learning_map, step, learner_state=learner_state,
            user_id=str(user_id), tuning=profile,
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
            blueprint, material=material, user_id=str(user_id), tuning=profile
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
            stored = await db.get(CourseChapter, chapter.id)
            if stored is None:
                yield _error("not_found", "这节课已不存在")
                return
            await free_course_service.persist_blueprint(
                db, stored, blueprint.model_dump(mode="json")
            )
            await free_course_service.persist_lesson(db, stored, lesson)
            await free_course_service.finalize_course(
                db, course_id=course_id, status="ready"
            )
    except Exception:  # noqa: BLE001 — a storage failure must end loudly
        logger.exception("free-course persist failed for %s", course_id)
        yield _error("persist_failed", "课程数据保存失败")
        return

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