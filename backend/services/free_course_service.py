"""Free-Course persistence, ownership and reads. No ai/ calls live here.

Same IDOR red line as course_service: every read by id filters on user_id too,
so "not yours" and "not there" are both None -> 404. This module owns the ORM for
the free-course side (courses tree reuse + the two lesson tables) and delegates
generation to services/free_course_events, which runs ai.free_course and calls
back here to land each step.
"""

import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ai.free_course.types import LearningObject, Lesson, ObjectPayload
from models.course import Course, CourseChapter, CourseUnit
from models.free_course import CourseLessonObject, CourseLessonObservation
from schemas.free_course import (
    AnswerFeedbackOut,
    FreeCourseDetailOut,
    FreeLessonContentOut,
    FreeLessonOut,
    FreeUnitOut,
    LearningObjectOut,
    LessonBlueprintOut,
    ObservationIn,
)

# Free courses never run the video search/organize gate; the status column simply
# reflects build lifecycle (building during the SSE, ready when done).
_BUILDING = "building"
_READY = "ready"
_FAILED = "failed"
_CHAPTER_READY = "ready"


class FreeCourseInputError(ValueError):
    """Bad request input (missing option_id/text). Converted to a 400 in the API."""


async def create_free_course(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    intent: str,
    conversation_id: uuid.UUID | None,
) -> Course:
    """The building course shell, hidden from lists until `ready`."""
    course = Course(
        user_id=user_id,
        mode="free",
        topic=intent[:120],
        title=intent[:120],
        status=_BUILDING,
        search_status="searched",  # free courses have no broad-search sub-state
        conversation_id=conversation_id,
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


async def finalize_course(
    db: AsyncSession, *, course_id: uuid.UUID, status: str
) -> None:
    course = await db.get(Course, course_id)
    if course is not None:
        course.status = status
        course.search_status = "searched"
        await db.commit()


async def persist_intent(
    db: AsyncSession, course: Course, intent: dict
) -> None:
    """The understand step: real topic/title + the intent (kept verbatim)."""
    course.mode = "free"
    course.topic = intent["topic"]
    course.title = intent["topic"]
    course.intake_json = {"intent": intent}
    await db.commit()


async def persist_map(db: AsyncSession, course: Course, map: dict) -> None:
    """The structure step: render the map as the unit/chapter tree.

    Idempotent on rebuild: any earlier tree for this course is replaced, so a
    retried stream cannot leave stale units behind (决策: 重复生成不产生脏数据).
    Map-level metadata (audience/summary) has no column of its own; it lives in
    intake_json rather than duplicating the structural tree.
    """
    await db.execute(delete(CourseUnit).where(CourseUnit.course_id == course.id))
    await db.flush()  # DB FK CASCADE removes the old chapters
    course.title = map["title"]
    course.intake_json = {
        **(course.intake_json or {}),
        "map": {
            "title": map["title"],
            "audience": map.get("audience"),
            "summary": map.get("summary"),
        },
    }
    for unit_index, unit in enumerate(map.get("units", [])):
        db_unit = CourseUnit(
            course_id=course.id,
            order_index=unit_index,
            title=unit["title"],
            status="not_started",
        )
        db.add(db_unit)
        await db.flush()
        for lesson_index, lesson in enumerate(unit.get("lessons", [])):
            db.add(
                CourseChapter(
                    unit_id=db_unit.id,
                    order_index=lesson_index,
                    title=lesson["title"],
                    objective=lesson.get("objective"),
                    status="not_started",
                )
            )
    await db.commit()


async def find_lesson_chapter(
    db: AsyncSession,
    *,
    course_id: uuid.UUID,
    unit_title: str,
    lesson_title: str,
) -> CourseChapter | None:
    result = await db.execute(
        select(CourseChapter)
        .join(CourseUnit, CourseChapter.unit_id == CourseUnit.id)
        .where(
            CourseUnit.course_id == course_id,
            CourseUnit.title == unit_title,
            CourseChapter.title == lesson_title,
        )
    )
    return result.scalar_one_or_none()


async def persist_blueprint(
    db: AsyncSession, chapter: CourseChapter, blueprint: dict
) -> None:
    chapter.blueprint_json = blueprint
    await db.commit()


async def persist_lesson(
    db: AsyncSession, chapter: CourseChapter, lesson: Lesson
) -> None:
    """The content step: land the lesson's structured objects on its chapter.

    Idempotent like the map: re-persisting a chapter replaces its objects, so a
    refined/regenerated lesson never stacks duplicates. Marks the chapter `ready`
    (= has content).
    """
    await db.execute(
        delete(CourseLessonObject).where(
            CourseLessonObject.chapter_id == chapter.id
        )
    )
    for index, obj in enumerate(lesson.objects):
        db.add(
            CourseLessonObject(
                chapter_id=chapter.id,
                order_index=index,
                kind=obj.kind,
                title=obj.title,
                body=obj.body,
                concept=obj.concept,
                difficulty=obj.difficulty,
                payload_json=(
                    obj.payload.model_dump(mode="json") if obj.payload else None
                ),
            )
        )
    chapter.status = _CHAPTER_READY
    await db.commit()


async def get_detail(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID
) -> FreeCourseDetailOut | None:
    """Owned tree read: units -> lessons with objective, blueprint, has_content."""
    result = await db.execute(
        select(Course)
        .where(Course.id == course_id, Course.user_id == user_id)
        .options(selectinload(Course.units).selectinload(CourseUnit.chapters))
    )
    course = result.scalar_one_or_none()
    if course is None:
        return None
    content = await _content_counts(db, course_id=course.id)
    intent = (course.intake_json or {}).get("intent")
    map_meta = (course.intake_json or {}).get("map", {})
    units: list[FreeUnitOut] = []
    for unit in course.units:
        lessons = [
            FreeLessonOut(
                id=chapter.id,
                title=chapter.title,
                objective=chapter.objective,
                blueprint=(
                    LessonBlueprintOut.model_validate(chapter.blueprint_json)
                    if chapter.blueprint_json
                    else None
                ),
                has_content=content.get(chapter.id, 0) > 0,
            )
            for chapter in unit.chapters
        ]
        units.append(
            FreeUnitOut(
                id=unit.id, title=unit.title, objective=unit_objective(unit), lessons=lessons
            )
        )
    return FreeCourseDetailOut(
        id=course.id,
        mode=course.mode,
        status=course.status,
        title=course.title,
        topic=course.topic,
        audience=map_meta.get("audience"),
        summary=map_meta.get("summary"),
        intent=intent,
        units=units,
    )


async def get_lesson_content(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID, chapter_id: uuid.UUID
) -> FreeLessonContentOut | None:
    """A chapter's structured objects (securely: answer/expected stripped)."""
    if await get_owned_course(db, user_id=user_id, course_id=course_id) is None:
        return None
    chapter = await _owned_chapter(
        db, course_id=course_id, chapter_id=chapter_id
    )
    if chapter is None:
        return None
    objects = await _load_objects(db, chapter_id=chapter.id)
    return FreeLessonContentOut(
        chapter_id=chapter.id,
        title=chapter.title,
        objective=chapter.objective or "",
        objects=[_to_read_object(obj) for obj in objects],
    )


async def submit_observation(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    chapter_id: uuid.UUID,
    submission: ObservationIn,
) -> AnswerFeedbackOut | None:
    """Judge + feedback + persist one answer (拍板 5: 客观题本地判定 + LLM 反馈).

    Objective items: the service compares option ids and passes the verdict in —
    the model only explains. Open items: the model judges against `expected`.
    Every answer becomes an observation row (the future learner-state input).
    """
    if await get_owned_course(db, user_id=user_id, course_id=course_id) is None:
        return None
    chapter = await _owned_chapter(db, course_id=course_id, chapter_id=chapter_id)
    if chapter is None:
        return None
    object_row = await db.get(
        CourseLessonObject, submission.object_id,
    )
    if object_row is None or object_row.chapter_id != chapter.id:
        return None

    obj = LearningObject(
        kind=object_row.kind,
        title=object_row.title,
        body=object_row.body,
        concept=object_row.concept,
        difficulty=object_row.difficulty or "core",
        payload=(
            ObjectPayload.model_validate(object_row.payload_json)
            if object_row.payload_json
            else None
        ),
    )

    payload = obj.payload
    has_options = bool(payload and payload.options)
    if has_options:
        if not submission.option_id:
            raise FreeCourseInputError("option_id_required")
        learner_answer = submission.option_id
        verdict = (
            "correct" if submission.option_id == payload.answer else "incorrect"
        )
    else:
        if not submission.text:
            raise FreeCourseInputError("text_required")
        learner_answer = submission.text
        verdict = None  # let the model judge

    from ai.free_course.feedback import explain_answer

    feedback = await explain_answer(
        lesson_title=chapter.title,
        lesson_objective=chapter.objective or "",
        obj=obj,
        learner_answer=learner_answer,
        verdict=verdict,
        user_id=str(user_id),
    )
    db.add(
        CourseLessonObservation(
            object_id=object_row.id,
            kind="answer",
            response_json=submission.as_learner_response,
            verdict=feedback.verdict,
            is_correct=feedback.verdict == "correct",
            feedback=feedback.feedback,
        )
    )
    await db.commit()
    return AnswerFeedbackOut(
        verdict=feedback.verdict,
        feedback=feedback.feedback,
        hint=feedback.hint,
        is_correct=feedback.verdict == "correct",
    )


# --- private helpers -------------------------------------------------------


async def _owned_chapter(
    db: AsyncSession, *, course_id: uuid.UUID, chapter_id: uuid.UUID
) -> CourseChapter | None:
    result = await db.execute(
        select(CourseChapter)
        .join(CourseUnit, CourseChapter.unit_id == CourseUnit.id)
        .where(
            CourseUnit.course_id == course_id,
            CourseChapter.id == chapter_id,
        )
    )
    return result.scalar_one_or_none()


async def _load_objects(
    db: AsyncSession, *, chapter_id: uuid.UUID
) -> list[CourseLessonObject]:
    result = await db.execute(
        select(CourseLessonObject)
        .where(CourseLessonObject.chapter_id == chapter_id)
        .order_by(CourseLessonObject.order_index)
    )
    return list(result.scalars())


async def _content_counts(
    db: AsyncSession, *, course_id: uuid.UUID
) -> dict[uuid.UUID, int]:
    """chapter_id -> object count for the course (via unit/chapter FKs)."""
    rows = (
        await db.execute(
            select(CourseLessonObject.chapter_id, func.count())
            .join(
                CourseChapter,
                CourseLessonObject.chapter_id == CourseChapter.id,
            )
            .join(CourseUnit, CourseChapter.unit_id == CourseUnit.id)
            .where(CourseUnit.course_id == course_id)
            .group_by(CourseLessonObject.chapter_id)
        )
    ).all()
    return {chapter_id: count for chapter_id, count in rows}


def _to_read_object(obj: CourseLessonObject) -> LearningObjectOut:
    payload = obj.payload_json or {}
    options = [
        {"id": option.get("id"), "text": option.get("text")}
        for option in payload.get("options", [])
        if option.get("id") is not None and option.get("text")
    ]
    return LearningObjectOut(
        id=obj.id,
        kind=obj.kind,
        title=obj.title,
        body=obj.body,
        concept=obj.concept,
        difficulty=obj.difficulty or "core",
        options=options,
        hint=payload.get("hint"),
    )


def unit_objective(unit: CourseUnit) -> str | None:
    """Units have no objective column; the first lesson's objective stands in."""
    for chapter in unit.chapters:
        if chapter.objective:
            return chapter.objective
    return None