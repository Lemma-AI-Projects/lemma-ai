"""Free-Course REST + SSE endpoints.

Two distinct streaming concerns the video pipeline solved with Redis, we solve
synchronously here: the build runs inside the SSE generator (free_course_events)
and persists with short-lived sessions — never holding a Depends(get_db) session
for the whole stream (same rule as courses.stream_organize).

IDOR line is unchanged: every by-id read AND the stream's up-front check filter
on user_id, so "not yours" and "not there" are both 404.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from core.database import AsyncSessionLocal, get_db
from core.security import CurrentUser, get_current_user
from schemas.free_course import (
    AnswerFeedbackOut,
    CourseTreeEditIn,
    CourseTuningIn,
    FreeCourseCreateIn,
    FreeCourseCreateOut,
    FreeCourseDetailOut,
    FreeLessonContentOut,
    ObservationIn,
    SessionProgressIn,
    TeachingSessionOut,
    TeachingTurnIn,
    TeachingTurnOut,
)
from services import (
    free_course_events,
    free_course_service,
    free_course_session_service,
)

router = APIRouter(prefix="/free-courses", tags=["free-courses"])

_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="free_course_not_found"
)

_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",  # tell nginx not to buffer SSE
}


@router.post(
    "", response_model=FreeCourseCreateOut, status_code=status.HTTP_201_CREATED
)
async def create_free_course(
    payload: FreeCourseCreateIn,
    current_user: CurrentUser = Depends(get_current_user),
    db=Depends(get_db),
) -> FreeCourseCreateOut:
    """Create the building course shell; the build runs over build/stream."""
    course = await free_course_service.create_free_course(
        db,
        user_id=current_user.id,
        intent=payload.intent,
        conversation_id=payload.conversation_id,
    )
    return FreeCourseCreateOut(course_id=course.id, status=course.status)


@router.get("/{course_id}", response_model=FreeCourseDetailOut)
async def get_free_course(
    course_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db=Depends(get_db),
) -> FreeCourseDetailOut:
    detail = await free_course_service.get_detail(
        db, user_id=current_user.id, course_id=course_id
    )
    if detail is None:
        raise _NOT_FOUND
    return detail


@router.get("/{course_id}/build/stream")
async def stream_free_course_build(
    course_id: uuid.UUID,
    intent: str = "",
    current_user: CurrentUser = Depends(get_current_user),
) -> StreamingResponse:
    # Ownership checked once up front (consistent 404), in a short-lived session —
    # never a Depends(get_db) session held across the whole stream.
    async with AsyncSessionLocal() as db:
        owned = await free_course_service.get_owned_course(
            db, user_id=current_user.id, course_id=course_id
        )
    if owned is None:
        raise _NOT_FOUND
    return StreamingResponse(
        free_course_events.stream_free_course_build(
            current_user.id, course_id, intent
        ),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


@router.post("/{course_id}/tuning", response_model=FreeCourseDetailOut)
async def set_free_course_tuning(
    course_id: uuid.UUID,
    payload: CourseTuningIn,
    current_user: CurrentUser = Depends(get_current_user),
    db=Depends(get_db),
) -> FreeCourseDetailOut:
    """Persist the learner's pre-blueprint tuning for this course.

    ``skip`` marks the questionnaire as answered so ``build/stream`` resumes into
    phase 2 (with the learner's dims left as None -> the inferred persona stands).
    Otherwise the four chosen dims are stored and merged over the persona on the
    next build stream.
    """
    if payload.skip:
        tuning: dict = {"course_volume": None, "depth": None,
                        "focus": None, "pace": None, "skip": True}
    else:
        tuning = {
            "course_volume": payload.volume,
            "depth": payload.depth,
            "focus": payload.focus,
            "pace": payload.pace,
            "skip": False,
        }
    result = await free_course_service.set_course_tuning(
        db, course_id=course_id, user_id=current_user.id, tuning=tuning
    )
    if result is None:
        raise _NOT_FOUND
    return result


@router.patch("/{course_id}/tree", response_model=FreeCourseDetailOut)
async def edit_free_course_tree(
    course_id: uuid.UUID,
    payload: CourseTreeEditIn,
    current_user: CurrentUser = Depends(get_current_user),
    db=Depends(get_db),
) -> FreeCourseDetailOut:
    """蓝图全量编辑：把期望的单元/课节树**按 id 增量写回**。

    编辑的主场景是**暂停点**（phase 1 跑完、phase 2 还没跑）——
    那一刻内容还没生成，所以改结构天然零破坏性，而且 phase 2 是从库里重读树的，
    改完直接生效，不需要另通知谁。

    已生成的课程也能调，但只要这次改动会丢掉课时正文或学习者作答，
    一律 409 拒绝：接口自己守住"不静默删用户数据"这条线，
    不指望调用方记得传对参数。
    """
    try:
        result = await free_course_service.apply_tree_edit(
            db, user_id=current_user.id, course_id=course_id, payload=payload
        )
    except free_course_service.TreeEditInvalid as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except free_course_service.TreeEditConflict as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "lesson_has_content",
                "lessons": exc.lesson_titles,
            },
        ) from exc
    if result is None:
        raise _NOT_FOUND
    return result


@router.get(
    "/{course_id}/chapters/{chapter_id}/lesson", response_model=FreeLessonContentOut
)
async def get_lesson(
    course_id: uuid.UUID,
    chapter_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db=Depends(get_db),
) -> FreeLessonContentOut:
    lesson = await free_course_service.get_lesson_content(
        db, user_id=current_user.id, course_id=course_id, chapter_id=chapter_id
    )
    if lesson is None:
        raise _NOT_FOUND
    return lesson


@router.get("/{course_id}/chapters/{chapter_id}/lesson/stream")
async def stream_lesson_generation(
    course_id: uuid.UUID,
    chapter_id: uuid.UUID,
    force: bool = False,
    current_user: CurrentUser = Depends(get_current_user),
) -> StreamingResponse:
    """Generate this lesson's content, streaming the two steps.

    A build only writes the lesson the path starts at, so every other lesson in
    the map arrives here the first time it is opened. Idempotent unless `force`.
    """
    async with AsyncSessionLocal() as db:
        owned = await free_course_service.get_owned_course(
            db, user_id=current_user.id, course_id=course_id
        )
    if owned is None:
        raise _NOT_FOUND
    return StreamingResponse(
        free_course_events.stream_free_course_lesson(
            current_user.id, course_id, chapter_id, force=force
        ),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


@router.post(
    "/{course_id}/chapters/{chapter_id}/observations",
    response_model=AnswerFeedbackOut,
)
async def submit_observation(
    course_id: uuid.UUID,
    chapter_id: uuid.UUID,
    payload: ObservationIn,
    current_user: CurrentUser = Depends(get_current_user),
    db=Depends(get_db),
) -> AnswerFeedbackOut:
    try:
        result = await free_course_service.submit_observation(
            db,
            user_id=current_user.id,
            course_id=course_id,
            chapter_id=chapter_id,
            submission=payload,
        )
    except free_course_service.FreeCourseInputError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    if result is None:
        raise _NOT_FOUND
    return result

# --- Teaching session (Hyperknow-style whiteboard + voice) ------------------
#
# A session is a state machine that stops and waits, so it is a REST cycle
# rather than one long stream: open it, play the plan locally, and come back
# only when the learner does something the model has to answer. Streaming the
# board itself would buy nothing here — the whole step (narration + actions)
# arrives before the first word is spoken, and the *client* is what paces it.


@router.post(
    "/{course_id}/chapters/{chapter_id}/session",
    response_model=TeachingSessionOut,
)
async def start_teaching_session(
    course_id: uuid.UUID,
    chapter_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db=Depends(get_db),
) -> TeachingSessionOut:
    """Open (or resume) this chapter's teaching session.

    Resumes an active session instead of planning a new one: a refresh must not
    restart the lecture — and must not pay for a second plan.
    """
    try:
        session = await free_course_session_service.start_session(
            db, user_id=current_user.id, course_id=course_id, chapter_id=chapter_id
        )
    except free_course_session_service.SessionUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "session_unavailable", "message": str(exc)},
        ) from exc
    if session is None:
        raise _NOT_FOUND
    return session


@router.get(
    "/{course_id}/chapters/{chapter_id}/session",
    response_model=TeachingSessionOut,
)
async def get_teaching_session(
    course_id: uuid.UUID,
    chapter_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db=Depends(get_db),
) -> TeachingSessionOut:
    """Read-only: what this chapter's session looks like right now (or 404)."""
    session = await free_course_session_service.get_session(
        db, user_id=current_user.id, course_id=course_id, chapter_id=chapter_id
    )
    if session is None:
        raise _NOT_FOUND
    return session


@router.post(
    "/{course_id}/chapters/{chapter_id}/session/turn",
    response_model=TeachingTurnOut,
)
async def submit_teaching_turn(
    course_id: uuid.UUID,
    chapter_id: uuid.UUID,
    payload: TeachingTurnIn,
    current_user: CurrentUser = Depends(get_current_user),
    db=Depends(get_db),
) -> TeachingTurnOut:
    """The learner did something: answer / "I don't understand" / interrupt.

    One endpoint for all three because they are the same transaction — react,
    then continue — and only the prompt differs.
    """
    try:
        turn = await free_course_session_service.submit_turn(
            db,
            user_id=current_user.id,
            course_id=course_id,
            chapter_id=chapter_id,
            payload=payload,
        )
    except free_course_session_service.SessionUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "session_unavailable", "message": str(exc)},
        ) from exc
    if turn is None:
        raise _NOT_FOUND
    return turn


@router.post(
    "/{course_id}/chapters/{chapter_id}/session/progress",
    response_model=TeachingSessionOut,
)
async def set_teaching_progress(
    course_id: uuid.UUID,
    chapter_id: uuid.UUID,
    payload: SessionProgressIn,
    current_user: CurrentUser = Depends(get_current_user),
    db=Depends(get_db),
) -> TeachingSessionOut:
    """Record how far the learner has played, so a refresh resumes there.

    Small and frequent by design: it is the only thing the client reports per
    step, and it exists so the server can say what was already taught without
    trusting the client to hold the whole transcript.
    """
    session = await free_course_session_service.set_progress(
        db,
        user_id=current_user.id,
        course_id=course_id,
        chapter_id=chapter_id,
        cursor=payload.cursor,
    )
    if session is None:
        raise _NOT_FOUND
    return session
