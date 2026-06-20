import asyncio
import logging
import uuid
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from redis.exceptions import RedisError
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal, get_db
from core.security import CurrentUser, get_current_user
from models.course import Course
from schemas.course import (
    ChapterVideoOut,
    CourseDetailOut,
    CourseListItemOut,
    IntakeAnswersIn,
    QuestionnaireOut,
)
from services import (
    course_organize_events,
    course_planning_service,
    course_search_service,
    course_service,
    video_asset_service,
)

logger = logging.getLogger("lemma.api.courses")

router = APIRouter(prefix="/courses", tags=["courses"])

_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="course_not_found"
)

# organize SSE heartbeat / DB-watchdog cadence (also the degrade poll interval).
_HEARTBEAT_S = 1.0
_TERMINAL_STATUSES = frozenset({"ready", "failed"})
_COMPOSE_FAILED = "course_compose_failed"
_COMPOSE_FAILED_MESSAGE = "课程编排未产出有效内容"


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
    # the card then streams progress via /organize/stream until ready/failed.
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


@router.get("/{course_id}/organize/stream")
async def stream_organize(
    course_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    # Ownership checked once up front (consistent 404). The stream relays the
    # worker's live organize events (real search hits + compose reasoning) from
    # Redis; an already-terminal course gets one terminal frame (reconnect safe),
    # and a Redis outage degrades to a DB snapshot stream (决策⑦).
    detail = await course_service.get_course_detail(
        db, user_id=current_user.id, course_id=course_id
    )
    if detail is None:
        raise _NOT_FOUND
    return StreamingResponse(
        _organize_event_stream(
            user_id=current_user.id, course_id=course_id, initial=detail
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # tell nginx not to buffer SSE
        },
    )


async def _course_snapshot(
    *, user_id: uuid.UUID, course_id: uuid.UUID
) -> CourseDetailOut | None:
    async with AsyncSessionLocal() as db:
        return await course_service.get_course_detail(
            db, user_id=user_id, course_id=course_id
        )


def _terminal_frame(detail: CourseDetailOut) -> str:
    """SSE frame for a terminal course: done(snapshot) on ready, error on failed.
    done carries the CourseDetailOut snapshot so the card flips straight to the
    real outline without a refetch (决策②); mode=json keeps it wire-safe."""
    if detail.status == "failed":
        return course_organize_events.to_sse(
            "error", {"code": _COMPOSE_FAILED, "message": _COMPOSE_FAILED_MESSAGE}
        )
    return course_organize_events.to_sse(
        "done", detail.model_dump(by_alias=True, mode="json")
    )


async def _terminal_frame_if_done(
    *, user_id: uuid.UUID, course_id: uuid.UUID
) -> str | None:
    """DB watchdog: the terminal SSE frame if the course has finished, else None.
    Course gone mid-stream -> an error frame (ends the stream cleanly)."""
    detail = await _course_snapshot(user_id=user_id, course_id=course_id)
    if detail is None:
        return course_organize_events.to_sse(
            "error", {"code": "course_not_found", "message": "课程不存在或已删除"}
        )
    if detail.status not in _TERMINAL_STATUSES:
        return None
    return _terminal_frame(detail)


async def _organize_event_stream(
    *, user_id: uuid.UUID, course_id: uuid.UUID, initial: CourseDetailOut
) -> AsyncIterator[str]:
    """Relay the worker's organize events to the browser.

    Reconnect safe: an already-terminal course gets only its terminal frame.
    Otherwise subscribe to Redis and forward search/reasoning; idle ticks drive
    the `searching` heartbeat and a DB watchdog (so a terminal published before
    we subscribed — pub/sub has no replay — still ends the stream). Any Redis
    failure degrades to the DB snapshot stream (决策⑦), invisible to the client.
    """
    if initial.status in _TERMINAL_STATUSES:
        yield _terminal_frame(initial)
        return

    seen_event = False
    try:
        async for envelope in course_organize_events.subscribe(
            course_id, poll_timeout=_HEARTBEAT_S
        ):
            if envelope is None:
                if not seen_event:
                    yield course_organize_events.to_sse("searching", {})
                terminal = await _terminal_frame_if_done(
                    user_id=user_id, course_id=course_id
                )
                if terminal is not None:
                    yield terminal
                    return
                continue
            event = envelope.get("event")
            data = envelope.get("data") or {}
            if event in ("search", "reasoning"):
                seen_event = True
                yield course_organize_events.to_sse(event, data)
            elif event == "done":
                # Worker signals done; build the snapshot from our own context.
                terminal = await _terminal_frame_if_done(
                    user_id=user_id, course_id=course_id
                )
                yield (
                    terminal
                    if terminal is not None
                    else course_organize_events.to_sse(
                        "error",
                        {"code": _COMPOSE_FAILED, "message": _COMPOSE_FAILED_MESSAGE},
                    )
                )
                return
            elif event == "error":
                yield course_organize_events.to_sse(
                    "error",
                    {
                        "code": data.get("code") or _COMPOSE_FAILED,
                        "message": data.get("message") or _COMPOSE_FAILED_MESSAGE,
                    },
                )
                return
    except (RedisError, OSError) as exc:
        logger.warning("organize stream degraded to DB snapshot: %s", exc)
        async for frame in _degrade_snapshot_stream(
            user_id=user_id, course_id=course_id, search_emitted=seen_event
        ):
            yield frame


async def _degrade_snapshot_stream(
    *, user_id: uuid.UUID, course_id: uuid.UUID, search_emitted: bool
) -> AsyncIterator[str]:
    """Redis-down fallback: poll the DB ~1s, emit searching/search/done/error
    (no live reasoning). Mirrors the retired /build/stream snapshot loop."""
    while True:
        detail = await _course_snapshot(user_id=user_id, course_id=course_id)
        if detail is None:
            yield course_organize_events.to_sse(
                "error", {"code": "course_not_found", "message": "课程不存在或已删除"}
            )
            return
        if detail.status in _TERMINAL_STATUSES:
            yield _terminal_frame(detail)
            return
        if not search_emitted:
            async with AsyncSessionLocal() as db:
                pool = await course_search_service.load_search_candidates(
                    db, course_id=course_id
                )
            if pool:
                yield course_organize_events.to_sse(
                    "search", course_organize_events.build_search_payload(pool)
                )
                search_emitted = True
            else:
                yield course_organize_events.to_sse("searching", {})
        else:
            yield course_organize_events.to_sse("searching", {})
        await asyncio.sleep(_HEARTBEAT_S)
