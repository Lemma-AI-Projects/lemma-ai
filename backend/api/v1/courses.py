import asyncio
import uuid
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ai.errors import AIError
from core.database import AsyncSessionLocal, get_db
from core.security import CurrentUser, get_current_user
from models.course import Course
from schemas.course import (
    BuildProgressEvent,
    CourseBuildAcceptedOut,
    CourseDetailOut,
    CourseListItemOut,
    CourseOutlineOut,
    CoursePlanIn,
    CoursePlanOut,
    IntakeAnswersIn,
    QuestionnaireOut,
)
from services import (
    conversation_service,
    course_build_service,
    course_planning_service,
    course_service,
)
from tasks.course_build import build_course

router = APIRouter(prefix="/courses", tags=["courses"])

_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="course_not_found"
)

# SSE build progress: poll the DB snapshot this often; stop at a terminal state.
_BUILD_POLL_INTERVAL_S = 1.0
_TERMINAL_STATUSES = frozenset({"ready", "failed"})


def _ai_unavailable(exc: AIError) -> HTTPException:
    # Interactive generation failed (provider down / rate limited / timed out).
    # Surface a stable business code the frontend can act on; raw stays in logs.
    return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=exc.code)


@router.post("/plan", response_model=CoursePlanOut, status_code=status.HTTP_201_CREATED)
async def create_plan(
    payload: CoursePlanIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CoursePlanOut:
    if payload.conversation_id is not None:
        # Linking to a conversation requires owning it (IDOR + avoids a dangling
        # FK / 500). Foreign and missing are indistinguishable: both 404.
        owned = await conversation_service.get_owned_conversation(
            db, user_id=current_user.id, conversation_id=payload.conversation_id
        )
        if owned is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="conversation_not_found",
            )
    try:
        course, questionnaire = await course_planning_service.create_plan(
            db,
            current_user,
            topic=payload.topic,
            conversation_id=payload.conversation_id,
        )
    except AIError as exc:
        raise _ai_unavailable(exc) from exc
    return CoursePlanOut(
        course_id=course.id,
        questionnaire=QuestionnaireOut.model_validate(questionnaire.model_dump()),
    )


@router.post("/{course_id}/intake", response_model=CourseOutlineOut)
async def submit_intake(
    course_id: uuid.UUID,
    payload: IntakeAnswersIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CourseDetailOut:
    answers = {answer.question_id: answer.answer for answer in payload.answers}
    try:
        detail = await course_planning_service.submit_answers(
            db, current_user, course_id=course_id, answers=answers
        )
    except AIError as exc:
        raise _ai_unavailable(exc) from exc
    if detail is None:
        raise _NOT_FOUND
    return detail


@router.get("", response_model=list[CourseListItemOut])
async def list_courses(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Course]:
    return await course_service.list_courses(
        db, user_id=current_user.id, limit=limit, offset=offset
    )


@router.get("/{course_id}", response_model=CourseDetailOut)
async def get_course(
    course_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CourseDetailOut:
    detail = await course_service.get_course_detail(
        db, user_id=current_user.id, course_id=course_id
    )
    if detail is None:
        raise _NOT_FOUND
    return detail


@router.post(
    "/{course_id}/build",
    response_model=CourseBuildAcceptedOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def start_build(
    course_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CourseBuildAcceptedOut:
    # Flip to building synchronously (SSE shows it immediately), then hand the
    # long search/select work to Celery (rules 第九章) and return 202.
    course = await course_build_service.mark_building(
        db, user_id=current_user.id, course_id=course_id
    )
    if course is None:
        raise _NOT_FOUND
    build_course.delay(str(course_id))
    return CourseBuildAcceptedOut(course_id=course_id)


@router.get("/{course_id}/build/stream")
async def stream_build(
    course_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    # Ownership checked once up front (consistent 404); the stream then polls the
    # DB snapshot — it never talks to the worker directly (DB is the truth).
    detail = await course_service.get_course_detail(
        db, user_id=current_user.id, course_id=course_id
    )
    if detail is None:
        raise _NOT_FOUND
    return StreamingResponse(
        _build_event_stream(user_id=current_user.id, course_id=course_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # tell nginx not to buffer SSE
        },
    )


def _progress_frame(detail: CourseDetailOut) -> str:
    payload = BuildProgressEvent(course=detail).model_dump_json(by_alias=True)
    return f"event: progress\ndata: {payload}\n\n"


async def _build_event_stream(
    *, user_id: uuid.UUID, course_id: uuid.UUID
) -> AsyncIterator[str]:
    """Emit a full snapshot each tick (no diff) until the build is terminal.

    Each poll uses its own short-lived session (never holds the request's db for
    the stream's lifetime). Reconnect is naturally correct: the first frame is a
    fresh full snapshot.
    """
    while True:
        async with AsyncSessionLocal() as db:
            detail = await course_service.get_course_detail(
                db, user_id=user_id, course_id=course_id
            )
        if detail is None:
            return  # course deleted mid-stream — just end
        yield _progress_frame(detail)
        if detail.status in _TERMINAL_STATUSES:
            yield "event: done\ndata: {}\n\n"
            return
        await asyncio.sleep(_BUILD_POLL_INTERVAL_S)
