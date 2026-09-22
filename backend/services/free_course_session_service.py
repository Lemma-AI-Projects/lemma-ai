"""Teaching session: the state machine behind the whiteboard.

Layering, deliberately the same as the rest of Free-Course: this module owns
ownership, persistence and *who decides what*, and `ai/free_course/teaching`
owns the teaching language. Nothing here invents board vocabulary; nothing there
touches the database.

Three decisions worth keeping:

- **A choice question is graded here, not by the model.** Same rule as
  `submit_observation` (拍板 5): comparing option ids is exact, and an LLM
  hiccup must never turn a right answer into a wrong one. Open questions have no
  exact comparison, so those go to the model against the question's own rubric.
- **A confused learner gets a *new* explanation, not a repeat.** This is the one
  signal the reference product actually reacts to, so it is the one place where
  the session is allowed to change what was already taught.
- **`cursor` means "the next step to play", not "the number of steps that
  exist".** Steps are appended as they are generated, so the two diverge as soon
  as a turn adds more than one — and a refresh has to resume at the right beat,
  not at the end of the plan.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.errors import FreeCourseError
from ai.free_course.teaching import (
    SessionSignal,
    SessionStepRef,
    TeachingQuestion,
    TeachingSessionPlan,
    TeachingStep,
    TeachingTurn,
    plan_session,
    respond_to,
)
from ai.free_course.types import LearningObject, LessonBlueprint, ObjectPayload
from models.course import CourseChapter, CourseUnit
from models.free_course import CourseLessonObject
from models.free_course_session import FreeCourseSession
from schemas.free_course import (
    BoardActionOut,
    BoardPointOut,
    PracticeOptionOut,
    SessionTranscriptEntryOut,
    TeachingQuestionOut,
    TeachingSessionOut,
    TeachingStepOut,
    TeachingTurnIn,
    TeachingTurnOut,
)
from services import free_course_service

# How many past steps are sent back to the model as "already taught". The whole
# transcript would grow without bound over a long session; the last few steps
# are what a teacher would actually be keeping in mind, and the point of the
# list is to stop the model repeating itself.
_TAUGHT_WINDOW = 6


class SessionUnavailable(Exception):
    """The session cannot run — the UI shows the reason instead of a board."""


def _chapter_query(course_id: uuid.UUID, chapter_id: uuid.UUID):
    return (
        select(CourseChapter)
        .join(CourseUnit, CourseChapter.unit_id == CourseUnit.id)
        .where(
            CourseUnit.course_id == course_id,
            CourseChapter.id == chapter_id,
        )
    )


async def _load_objects(
    db: AsyncSession, *, chapter_id: uuid.UUID
) -> list[CourseLessonObject]:
    result = await db.execute(
        select(CourseLessonObject)
        .where(CourseLessonObject.chapter_id == chapter_id)
        .order_by(CourseLessonObject.order_index)
    )
    return list(result.scalars().all())


def _to_learning_objects(rows: list[CourseLessonObject]) -> list[LearningObject]:
    """DB rows -> the AI layer's type, *with* payloads intact.

    The learner-facing read strips answers; the session needs them, because it
    is the session that grades the Quick Check. Keeping the two shapes separate
    is what stops the strip from being quietly undone on the wire.
    """
    objects: list[LearningObject] = []
    for row in rows:
        objects.append(
            LearningObject(
                kind=row.kind,
                title=row.title,
                body=row.body,
                concept=row.concept,
                difficulty=row.difficulty,
                payload=ObjectPayload.model_validate(row.payload_json)
                if row.payload_json
                else None,
            )
        )
    return objects


def _wire_step(step: TeachingStep) -> TeachingStepOut:
    question = None
    if step.question is not None:
        question = TeachingQuestionOut(
            kind=step.question.kind,
            prompt=step.question.prompt,
            options=[
                PracticeOptionOut(id=option.id, text=option.text)
                for option in step.question.options
            ],
            hint=step.question.hint,
        )
    return TeachingStepOut(
        id=step.id,
        title=step.title,
        branch=step.branch,
        narration=step.narration,
        actions=[
            BoardActionOut(
                kind=action.kind,
                at=BoardPointOut(x=action.at.x, y=action.at.y) if action.at else None,
                to=BoardPointOut(x=action.to.x, y=action.to.y) if action.to else None,
                points=[BoardPointOut(x=p.x, y=p.y) for p in action.points],
                shape=action.shape,
                text=action.text,
                color=action.color,
                size=action.size,
                id=action.id,
                target=action.target,
                duration_ms=action.duration_ms,
                cue=action.cue,
            )
            for action in step.actions
        ],
        question=question,
    )


def _wire_session(
    session: FreeCourseSession,
    *,
    steps: list[TeachingStep],
    has_content: bool = True,
) -> TeachingSessionOut:
    return TeachingSessionOut(
        session_id=session.id,
        chapter_id=session.chapter_id,
        title=str(session.plan_json.get("title") or ""),
        objective=str(session.plan_json.get("objective") or ""),
        status=session.status,
        cursor=session.cursor,
        steps=[_wire_step(step) for step in steps],
        transcript=[
            SessionTranscriptEntryOut.model_validate(entry)
            for entry in (session.transcript_json or [])
        ],
        has_content=has_content,
    )


def _plan_steps(session: FreeCourseSession) -> list[TeachingStep]:
    return [
        TeachingStep.model_validate(raw)
        for raw in (session.plan_json.get("steps") or [])
    ]


async def _owned_session(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    chapter_id: uuid.UUID,
    session_id: uuid.UUID | None = None,
) -> FreeCourseSession | None:
    if await free_course_service.get_owned_course(
        db, user_id=user_id, course_id=course_id
    ) is None:
        return None
    statement = (
        select(FreeCourseSession)
        .where(
            FreeCourseSession.chapter_id == chapter_id,
            FreeCourseSession.chapter_id.in_(
                select(CourseChapter.id)
                .join(CourseUnit, CourseChapter.unit_id == CourseUnit.id)
                .where(CourseUnit.course_id == course_id)
            ),
        )
        .order_by(FreeCourseSession.created_at.desc())
    )
    if session_id is not None:
        statement = statement.where(FreeCourseSession.id == session_id)
    result = await db.execute(statement)
    return result.scalars().first()


async def get_session(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID, chapter_id: uuid.UUID
) -> TeachingSessionOut | None:
    """The chapter's current session, or None when nothing has been started.

    Read-only and side-effect free: opening the page must not start a lecture.
    """
    session = await _owned_session(
        db, user_id=user_id, course_id=course_id, chapter_id=chapter_id
    )
    if session is None:
        return None
    return _wire_session(session, steps=_plan_steps(session))


async def start_session(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID, chapter_id: uuid.UUID
) -> TeachingSessionOut | None:
    """Open a session, or resume the active one.

    Resuming rather than restarting is what makes a refresh safe; pressing the
    start button again after finishing does start over, because that is what
    "start learning" means.
    """
    if await free_course_service.get_owned_course(
        db, user_id=user_id, course_id=course_id
    ) is None:
        return None
    existing = await _owned_session(
        db, user_id=user_id, course_id=course_id, chapter_id=chapter_id
    )
    if existing is not None and existing.status == "active":
        return _wire_session(existing, steps=_plan_steps(existing))

    result = await db.execute(_chapter_query(course_id, chapter_id))
    chapter = result.scalar_one_or_none()
    if chapter is None:
        return None
    objects = _to_learning_objects(await _load_objects(db, chapter_id=chapter_id))
    if not objects:
        # Nothing to teach yet. Say so instead of opening an empty board — the
        # caller generates the lesson and comes back.
        return TeachingSessionOut(
            session_id=uuid.uuid4(),
            chapter_id=chapter_id,
            title=chapter.title,
            objective=chapter.objective or "",
            status="empty",
            cursor=0,
            has_content=False,
        )

    blueprint = None
    if chapter.blueprint_json:
        try:
            blueprint = LessonBlueprint.model_validate(chapter.blueprint_json)
        except Exception:  # noqa: BLE001 — a stale blueprint must not block teaching
            blueprint = None

    try:
        plan = await plan_session(
            lesson_title=chapter.title,
            objective=chapter.objective or "",
            sequence=list(blueprint.sequence) if blueprint else [],
            objects=objects,
            user_id=str(user_id),
        )
    except FreeCourseError as exc:
        raise SessionUnavailable(str(exc)) from exc

    session = FreeCourseSession(
        chapter_id=chapter_id,
        status="active",
        cursor=0,
        plan_json={
            "title": plan.title,
            "objective": plan.objective,
            "steps": [step.model_dump(mode="json") for step in plan.steps],
        },
        transcript_json=[],
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return _wire_session(session, steps=plan.steps)


async def submit_turn(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    chapter_id: uuid.UUID,
    payload: TeachingTurnIn,
) -> TeachingTurnOut | None:
    session = await _owned_session(
        db, user_id=user_id, course_id=course_id, chapter_id=chapter_id
    )
    if session is None:
        return None
    steps = _plan_steps(session)
    if not steps:
        raise SessionUnavailable("session has no steps")

    cursor = payload.cursor if payload.cursor is not None else session.cursor
    cursor = max(0, min(cursor, len(steps)))
    question, asking_step_id = _question_at(steps, cursor, payload.step_id)

    signal = SessionSignal(
        kind=payload.signal,
        text=(payload.text or "").strip() or None,
        option_id=(payload.option_id or "").strip() or None,
    )
    if signal.kind == "answer" and question is None:
        raise SessionUnavailable("nothing to answer at this point")
    if signal.kind == "answer" and signal.text is None and signal.option_id is None:
        raise SessionUnavailable("answer signal carried no answer")

    verdict = None
    if signal.kind == "answer" and question is not None and question.kind == "choice":
        verdict = _grade_choice(question, signal.option_id)

    # What the learner actually said or picked, as text. Only meaningful for an
    # answer — for the other two signals the text IS the learner's input and is
    # already in the prompt, so repeating it here would just be noise.
    learner_answer = (
        _answer_text(question, signal) if signal.kind == "answer" else None
    )

    taught = [
        SessionStepRef(
            id=step.id,
            title=step.title,
            narration=step.narration,
            question=step.question.prompt if step.question else None,
        )
        for step in steps[max(0, cursor - _TAUGHT_WINDOW) : cursor]
    ]

    try:
        turn: TeachingTurn = await respond_to(
            lesson_title=str(session.plan_json.get("title") or ""),
            objective=str(session.plan_json.get("objective") or ""),
            taught=taught,
            signal=signal,
            question=question,
            learner_answer=learner_answer,
            verdict=verdict,
            user_id=str(user_id),
        )
    except FreeCourseError as exc:
        raise SessionUnavailable(str(exc)) from exc

    # Steps are appended, never spliced: everything already taught keeps its
    # index, so the transcript stays a truthful record of the lesson the learner
    # actually sat through — including the parts they later asked to redo.
    raw_steps = list(session.plan_json.get("steps") or [])
    raw_steps.extend(step.model_dump(mode="json") for step in turn.steps)
    session.plan_json = {**session.plan_json, "steps": raw_steps}

    entry = {
        "step_id": asking_step_id or "",
        "signal": signal.kind,
        "text": signal.text,
        "option_id": signal.option_id,
        "verdict": verdict or (turn.verdict if signal.kind == "answer" else None),
        "feedback": turn.feedback,
    }
    session.transcript_json = [*(session.transcript_json or []), entry]
    session.cursor = len(raw_steps)
    await db.commit()

    return TeachingTurnOut(
        verdict=entry["verdict"],
        feedback=turn.feedback,
        steps=[_wire_step(step) for step in turn.steps],
        cursor=session.cursor,
    )


async def set_progress(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    chapter_id: uuid.UUID,
    cursor: int,
) -> TeachingSessionOut | None:
    """Record how far the learner has played, so a refresh resumes there."""
    session = await _owned_session(
        db, user_id=user_id, course_id=course_id, chapter_id=chapter_id
    )
    if session is None:
        return None
    steps = _plan_steps(session)
    session.cursor = max(0, min(cursor, len(steps)))
    await db.commit()
    return _wire_session(session, steps=steps)


def _question_at(
    steps: list[TeachingStep], cursor: int, step_id: str | None
) -> tuple[TeachingQuestion | None, str | None]:
    """The question being answered, and the step that asked it.

    `step_id` wins when the client sends one (the learner may answer after the
    cursor moved on); otherwise the last played step is the one that asked.
    """
    if step_id:
        for step in steps:
            if step.id == step_id:
                return step.question, step.id
        return None, step_id
    for step in reversed(steps[:cursor]):
        if step.question is not None:
            return step.question, step.id
    return None, None


def _grade_choice(question: TeachingQuestion, option_id: str | None) -> str:
    """Exact, local, and conservative: nothing but the right id is 'correct'."""
    if option_id is None or question.answer is None:
        return "incorrect"
    return "correct" if option_id == question.answer else "incorrect"


def _answer_text(
    question: TeachingQuestion | None, signal: SessionSignal
) -> str | None:
    """The learner's answer as the teacher would see it on the page.

    For a choice question this is the option they clicked, spelled out ("b. 坡度
    接近零") rather than the bare id — a correction that names the wrong option is
    the whole content of 「即错即纠」, and an id alone gives the model nothing to
    name.
    """
    if signal.option_id:
        chosen = next(
            (o for o in (question.options if question else []) if o.id == signal.option_id),
            None,
        )
        return f"{signal.option_id}. {chosen.text}" if chosen else signal.option_id
    return signal.text
