"""Free-Course persistence, ownership and reads. No ai/ calls live here.

Same IDOR red line as course_service: every read by id filters on user_id too,
so "not yours" and "not there" are both None -> 404. This module owns the ORM for
the free-course side (courses tree reuse + the two lesson tables) and delegates
generation to services/free_course_events, which runs ai.free_course and calls
back here to land each step.
"""

import uuid
from typing import Any

from sqlalchemy import delete, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ai.free_course.types import (
    LearningIntent,
    LearningMap,
    LearningObject,
    Lesson,
    MapLesson,
    MapUnit,
    ObjectPayload,
    PathStep,
)
from models.course import Course, CourseChapter, CourseUnit
from models.free_course import CourseLessonObject, CourseLessonObservation
from schemas.free_course import (
    AnswerFeedbackOut,
    CourseTreeEditIn,
    FreeCourseDetailOut,
    FreeLessonContentOut,
    FreeLessonOut,
    FreeLessonRefOut,
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


async def get_course_tuning(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID
) -> dict[str, Any] | None:
    """The persisted questionnaire answer, or None while the course is unanswered.

    None is how phase 1 (ask the questionnaire) is told apart from phase 2 (run
    the build with an answer). Ownership still filters the read, so not-yours and
    not-there are both None.
    """
    course = await get_owned_course(db, user_id=user_id, course_id=course_id)
    return course.tuning_json if course is not None else None


async def set_course_tuning(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    tuning: dict,
) -> FreeCourseDetailOut | None:
    """Persist the questionnaire answer and return the updated detail.

    Returns None on not-owner/not-found. The stored map is exactly what phase 2
    merges over the inferred persona, so the learner's choices land in the prompts
    and nowhere else (tuning is a per-course projection, not the persona).
    """
    course = await get_owned_course(db, user_id=user_id, course_id=course_id)
    if course is None:
        return None
    course.tuning_json = tuning
    await db.commit()
    return await get_detail(db, user_id=user_id, course_id=course_id)


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


class LessonLookupMissing(Exception):
    """按标题找不到——调用方必须显式处理，不许静默跳过。"""

    def __init__(self, *, unit_title: str | None, lesson_title: str) -> None:
        self.unit_title = unit_title
        self.lesson_title = lesson_title
        super().__init__(f"no lesson named {lesson_title!r} (unit={unit_title!r})")


class LessonLookupAmbiguous(Exception):
    """同一课程/单元下有多节课同名 —— 按标题定位不再唯一，**不能猜**。

    这是「编辑允许改名」之后才可能出现的情形，也是这套标题定位真正的风险：
    猜错就是往别人的课上写蓝图，而且不报错。
    """

    def __init__(
        self, *, unit_title: str | None, lesson_title: str, count: int
    ) -> None:
        self.unit_title = unit_title
        self.lesson_title = lesson_title
        self.count = count
        super().__init__(
            f"ambiguous lesson {lesson_title!r} (unit={unit_title!r}): {count} matches"
        )


def resolve_chapter_by_titles(
    course: Course, *, unit_title: str | None, lesson_title: str
) -> CourseChapter:
    """在**已加载**的树上按标题找唯一一节课。

    AI 层（`LearningMap` / `PathStep`）本来就只带标题 —— 那是要喂给模型的形状，
    不该塞 id 进去。所以标题定位会长期存在，那就必须让它**宁可报错也不猜**：

    - 找不到 → `LessonLookupMissing`
    - 找到多节同名 → `LessonLookupAmbiguous`

    改名前这几乎不可能触发；改名一上线就变成真实路径。原实现用 `next(..., None)`
    静默取第一条，等于"悄悄写错课"。
    """
    candidates = [
        chapter
        for unit in course.units
        if unit_title is None or unit.title == unit_title
        for chapter in unit.chapters
        if chapter.title == lesson_title
    ]
    if not candidates:
        raise LessonLookupMissing(unit_title=unit_title, lesson_title=lesson_title)
    if len(candidates) > 1:
        raise LessonLookupAmbiguous(
            unit_title=unit_title, lesson_title=lesson_title, count=len(candidates)
        )
    return candidates[0]


async def find_lesson_chapter(
    db: AsyncSession,
    *,
    course_id: uuid.UUID,
    unit_title: str,
    lesson_title: str,
) -> CourseChapter | None:
    """按 (单元标题, 课节标题) 定位一节课（查库版）。

    - 找不到 → None —— **调用方必须显式处理**（原调用点 `if chapter is not None`
      直接跳过，是"蓝图步报成功、其实什么都没存"的静默失败）
    - 多节同名 → 抛 `LessonLookupAmbiguous`。原实现 `scalar_one_or_none()` 遇多行
      会抛 SQLAlchemy 的 `MultipleResultsFound`，表现成 500；这里换成有语义的领域错误。
    """
    rows = (
        (
            await db.execute(
                select(CourseChapter)
                .join(CourseUnit, CourseChapter.unit_id == CourseUnit.id)
                .where(
                    CourseUnit.course_id == course_id,
                    CourseUnit.title == unit_title,
                    CourseChapter.title == lesson_title,
                )
                # 只需要知道「是不是唯一」，多出来的不用取
                .limit(2)
            )
        )
        .scalars()
        .all()
    )
    if not rows:
        return None
    if len(rows) > 1:
        raise LessonLookupAmbiguous(
            unit_title=unit_title, lesson_title=lesson_title, count=len(rows)
        )
    return rows[0]


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


async def count_objects(db: AsyncSession, *, chapter_id: uuid.UUID) -> int:
    """How many content objects this chapter has (0 = not generated yet)."""
    return int(
        (
            await db.execute(
                select(func.count(CourseLessonObject.id)).where(
                    CourseLessonObject.chapter_id == chapter_id
                )
            )
        ).scalar_one()
        or 0
    )


async def get_owned_course_tree(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID
) -> Course | None:
    """Owned course with its unit/chapter tree eager-loaded, ordered.

    The tree IS the map (spec §15), so anything that has to reason about
    structure — a late lesson generation, an edit — reads it in one query
    instead of walking lazy relations per unit.
    """
    result = await db.execute(
        select(Course)
        .where(Course.id == course_id, Course.user_id == user_id)
        .options(selectinload(Course.units).selectinload(CourseUnit.chapters))
    )
    return result.scalar_one_or_none()


def map_from_tree(course: Course) -> LearningMap:
    """Rebuild the LearningMap from the persisted tree.

    A lesson generated after the build must read the map from the database, not
    from the build's stored output: editing the blueprint rewrites the tree, and
    the tree is what the learner actually sees. Metadata that has no column of
    its own (audience / summary) comes from intake_json, where persist_map put
    it.
    """
    meta = (course.intake_json or {}).get("map", {})
    return LearningMap(
        title=meta.get("title") or course.title,
        audience=meta.get("audience") or "",
        summary=meta.get("summary") or "",
        units=[
            MapUnit(
                title=unit.title,
                objective=unit_objective(unit) or "",
                lessons=[
                    MapLesson(title=chapter.title, objective=chapter.objective or "")
                    for chapter in unit.chapters
                ],
            )
            for unit in course.units
        ],
    )


def intent_from_course(course: Course) -> LearningIntent:
    """The intent the course was built from.

    Falls back to a minimal one built from the course's own topic for courses
    created before the intent was persisted — it never invents fields that were
    not captured.
    """
    stored = (course.intake_json or {}).get("intent")
    if stored:
        return LearningIntent.model_validate(stored)
    return LearningIntent(
        raw_request=course.topic, topic=course.topic, outcome=course.topic
    )


def step_for_chapter(course: Course, chapter: CourseChapter) -> PathStep:
    """Where this lesson sits in the map — what the writer needs to place it.

    `status` is always "unknown": the lesson is one we are about to teach, and
    claiming the learner already knows it would be a lie the writer would act on.
    """
    unit = next(
        (
            candidate
            for candidate in course.units
            if any(item.id == chapter.id for item in candidate.chapters)
        ),
        None,
    )
    return PathStep(
        unit_title=unit.title if unit is not None else "",
        lesson_title=chapter.title,
        objective=chapter.objective or "",
        status="unknown",
    )


async def get_detail(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID
) -> FreeCourseDetailOut | None:
    """Owned tree read: units -> lessons with objective, blueprint, has_content."""
    course = await get_owned_course_tree(db, user_id=user_id, course_id=course_id)
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
        # 问卷答案。蓝图页要显示「这课是按什么体量/深度生成的」—— 那本来就是用户
        # 自己选的，藏起来只会让人忘了自己选过什么。
        tuning=course.tuning_json,
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
    next_ref = await _next_lesson_ref(
        db, course_id=course_id, chapter_id=chapter.id
    )
    return FreeLessonContentOut(
        chapter_id=chapter.id,
        title=chapter.title,
        objective=chapter.objective or "",
        objects=[_to_read_object(obj) for obj in objects],
        next=next_ref,
    )


async def _next_lesson_ref(
    db: AsyncSession, *, course_id: uuid.UUID, chapter_id: uuid.UUID
) -> FreeLessonRefOut | None:
    """The lesson after this one, walking the map's own order (unit then lesson).

    Reads through the same relationships get_detail uses (both carry an explicit
    order_by), so "next" here and the order shown in the blueprint can never
    disagree. Returns None on the last lesson, which is how the runtime knows the
    course is finished.
    """
    result = await db.execute(
        select(Course)
        .where(Course.id == course_id)
        .options(selectinload(Course.units).selectinload(CourseUnit.chapters))
    )
    course = result.scalar_one_or_none()
    if course is None:
        return None
    ordered = [
        chapter for unit in course.units for chapter in unit.chapters
    ]
    for index, candidate in enumerate(ordered):
        if candidate.id != chapter_id:
            continue
        following = ordered[index + 1] if index + 1 < len(ordered) else None
        if following is None:
            return None
        return FreeLessonRefOut(chapter_id=following.id, title=following.title)
    return None


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

# --- Blueprint edit (全量编辑) -------------------------------------------


class TreeEditInvalid(Exception):
    """载荷本身不合法：引用了不属于本课的 id，或把树删空了。"""


class TreeEditConflict(Exception):
    """编辑会丢弃已有产物（课时正文 / 学习者作答）—— 拒绝，绝不静默删用户数据。"""

    def __init__(self, *, lesson_titles: list[str]) -> None:
        self.lesson_titles = lesson_titles
        super().__init__(
            "refusing to delete lessons that already have content or answers: "
            f"{lesson_titles}"
        )


async def _lessons_with_learner_data(
    db: AsyncSession, chapter_ids: list[uuid.UUID]
) -> list[str]:
    """这些章节里，哪些已经有生成内容（因而也有作答）。

    只需要查 `course_lesson_objects`：作答挂在 object 上，且有
    `ON DELETE CASCADE` —— 所以「有 object」必然涵盖「有 observation」。
    """
    if not chapter_ids:
        return []
    result = await db.execute(
        select(CourseChapter.title)
        .where(
            CourseChapter.id.in_(chapter_ids),
            exists().where(CourseLessonObject.chapter_id == CourseChapter.id),
        )
        .order_by(CourseChapter.order_index)
    )
    return list(result.scalars())


async def apply_tree_edit(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    payload: CourseTreeEditIn,
) -> FreeCourseDetailOut | None:
    """把蓝图编辑写回 unit/chapter 树，**按 id 增量 diff**。

    为什么不复用 `persist_map`：那个是全删全建（`delete(CourseUnit)` + flush），
    而级联链是

        course_units → course_chapters → course_lesson_objects → course_lesson_observations

    两级 `ON DELETE CASCADE`。走它等于**删掉已生成的课时正文和学习者的全部作答**，
    章节 id 也会重生成（已发出的课时链接全 404）。所以这里只动真正变了的行。

    返回值 None = 不是你的课或不存在（照旧 404）。载荷问题抛 `TreeEditInvalid`，
    会丢数据抛 `TreeEditConflict` —— 调用方翻译成 400 / 409，不一概 500。
    """
    course = await get_owned_course_tree(
        db, user_id=user_id, course_id=course_id
    )
    if course is None:
        return None

    existing_units = {unit.id: unit for unit in course.units}
    existing_chapters = {
        chapter.id: chapter
        for unit in course.units
        for chapter in unit.chapters
    }

    # 1. 认不出的 id 直接拒 —— 不做"忽略陌生 id"这种静默行为。
    #    静默忽略的后果是用户以为改了、其实没改，而且下一轮 diff 会把它当新增。
    for unit_in in payload.units:
        if unit_in.id is not None and unit_in.id not in existing_units:
            raise TreeEditInvalid(f"unit {unit_in.id} is not part of this course")
        for lesson_in in unit_in.lessons:
            if lesson_in.id is not None and lesson_in.id not in existing_chapters:
                raise TreeEditInvalid(
                    f"lesson {lesson_in.id} is not part of this course"
                )

    # 2. 树不能被删空。空树走到 phase 2 会以
    #    "path has no lesson to start from" 收场 —— 与其让用户卡在暂停点，
    #    不如在写回这一步就说清。
    if not any(unit.lessons for unit in payload.units):
        raise TreeEditInvalid("a course must keep at least one lesson")

    keep_chapter_ids = {
        lesson.id
        for unit_in in payload.units
        for lesson in unit_in.lessons
        if lesson.id is not None
    }
    doomed = [
        chapter.id
        for chapter_id, chapter in existing_chapters.items()
        if chapter_id not in keep_chapter_ids
    ]
    if doomed:
        # 3. 删之前先看会不会丢东西。暂停点上这里是空的（内容还没生成），
        #    所以主路径天然通过；一旦课程已经生成，就会挡住 —— 这正是要的。
        blocking = await _lessons_with_learner_data(db, doomed)
        if blocking:
            raise TreeEditConflict(lesson_titles=blocking)

    # 4. 就地更新 + 新增（先做，让「课节在单元间移动」的 unit_id 落库）
    #
    # `kept_unit_ids` 收的是**落库后真实存在的 id**，不是载荷里带的 id ——
    # 新增单元的 id 是这里 flush 出来的，载荷里根本没有它。
    # 第一版就是拿载荷里的 id 去算「要删哪些」，结果**把自己刚建的单元删了**，
    # 而且因为单元被 CASCADE，它下面的新课节也一起没了（smoke 抓到的）。
    kept_unit_ids: set[uuid.UUID] = set()
    for unit_index, unit_in in enumerate(payload.units):
        if unit_in.id is None:
            unit = CourseUnit(
                course_id=course.id,
                order_index=unit_index,
                title=unit_in.title,
                status="not_started",
            )
            db.add(unit)
            await db.flush()
        else:
            unit = existing_units[unit_in.id]
            unit.title = unit_in.title
            unit.order_index = unit_index
        kept_unit_ids.add(unit.id)

        for lesson_index, lesson_in in enumerate(unit_in.lessons):
            if lesson_in.id is None:
                db.add(
                    CourseChapter(
                        unit_id=unit.id,
                        order_index=lesson_index,
                        title=lesson_in.title,
                        objective=lesson_in.objective,
                        status="not_started",
                    )
                )
            else:
                chapter = existing_chapters[lesson_in.id]
                chapter.title = lesson_in.title
                chapter.objective = lesson_in.objective
                chapter.order_index = lesson_index
                # 课节可以换单元（拖到别的单元下面）。
                chapter.unit_id = unit.id
    await db.flush()

    # 5. 删除放在最后，且**先课节后单元**：先删单元的话会被 CASCADE 带走
    #    刚被移到别的单元下的课节。
    if doomed:
        await db.execute(delete(CourseChapter).where(CourseChapter.id.in_(doomed)))
    if kept_unit_ids:
        await db.execute(
            delete(CourseUnit).where(
                CourseUnit.course_id == course.id,
                CourseUnit.id.notin_(kept_unit_ids),
            )
        )
    else:
        await db.execute(delete(CourseUnit).where(CourseUnit.course_id == course.id))

    course.updated_at = func.now()
    await db.commit()
    return await get_detail(db, user_id=user_id, course_id=course_id)
