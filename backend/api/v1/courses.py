import asyncio
import uuid
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal, get_db
from core.security import CurrentUser, get_current_user
from models.course import Course
from schemas.course import (
    BuildProgressEvent,
    ChapterVideoOut,
    CourseDetailOut,
    CourseListItemOut,
    IntakeAnswersIn,
    QuestionnaireOut,
)
from services import (
    course_planning_service,
    course_service,
    video_asset_service,
)

router = APIRouter(prefix="/courses", tags=["courses"])

_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="course_not_found"
)

# SSE organize/build progress: poll the DB snapshot this often; stop at terminal.
_BUILD_POLL_INTERVAL_S = 1.0
_TERMINAL_STATUSES = frozenset({"ready", "failed"})


@router.post(
    "/{course_id}/intake",
    response_model=CourseDetailOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def submit_intake(
    course_id: uuid.UUID,
    payload: IntakeAnswersIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CourseDetailOut:
    # 搜索前置: record answers, flip the course to `organizing`, and enqueue the
    # organize task (compose over the pre-searched candidate pool, gated on the
    # broad search finishing). Returns the `organizing` snapshot (empty units);
    # the card then streams progress via /build/stream until ready/failed.
    answers = {answer.question_id: answer.answer for answer in payload.answers}
    detail = await course_planning_service.submit_answers(
        db, current_user, course_id=course_id, answers=answers
    )
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


@router.get(
    "/{course_id}/chapters/{chapter_id}/video", response_model=ChapterVideoOut
)
async def read_chapter_video(
    course_id: uuid.UUID,
    chapter_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ChapterVideoOut:
    # Opening a chapter's video is the "started this chapter" trigger: it lazily
    # downloads this chapter's video if needed and pre-warms the next one. 404
    # when not owned / chapter not in course / no chosen video (IDOR-safe — no
    # probing which ids exist). Returns immediately with status downloading while
    # a fetch is in flight; the client polls this same endpoint.
    video = await video_asset_service.get_chapter_video(
        db, current_user, course_id=course_id, chapter_id=chapter_id
    )
    if video is None:
        raise _NOT_FOUND
    return video


@router.get("/{course_id}/questionnaire", response_model=QuestionnaireOut)
async def get_questionnaire(
    course_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuestionnaireOut:
    # The intake-stage tool card fetches the questionnaire by courseId (live and
    # on reload). 404 when not owned / gone / already past intake.
    questionnaire = await course_service.get_questionnaire(
        db, user_id=current_user.id, course_id=course_id
    )
    if questionnaire is None:
        raise _NOT_FOUND
    return questionnaire


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
