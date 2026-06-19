"""课程编排 orchestration（搜索前置）: 诉求 -> (并发: 问卷 + 广搜) -> 答案 -> organize.

Composes ai/coursegen (the LLM brain) with course_service / course_search_service
(persistence); it never touches the ORM directly. 搜索前置状态机:
create_course_shell -> intake (问卷 + 广搜 并发后台填充) ->
submit_answers -> organizing (compose 选片+组织在 Celery 里跑) -> ready/failed.

异步取舍 (rules 第九章): the questionnaire is generated on a protected background
task (API process) so the chat tool turn gets the course id immediately; the
request-level broad search runs in Celery (kicked off by the chat turn, see
chat_service). submit_answers no longer generates an outline synchronously — it
records the answers, flips to `organizing`, and enqueues the organize Celery task
(compose over the cached candidate pool, gated on search completion).
"""

import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from ai.coursegen import generate_questionnaire
from core.database import AsyncSessionLocal
from core.security import CurrentUser
from models.course import Course
from schemas.course import CourseDetailOut
from services import course_service

logger = logging.getLogger("lemma.services.course_planning")

_ORGANIZING = "organizing"


async def create_course_shell(
    db: AsyncSession,
    user: CurrentUser,
    *,
    topic: str,
    conversation_id: uuid.UUID | None,
) -> Course:
    """Create the intake course row WITHOUT a questionnaire yet.

    Returns immediately with a course id so the chat tool turn can attach the
    card and persist the turn without blocking on the slow questionnaire LLM
    call; generate_and_store_questionnaire fills intake_json afterwards.
    """
    return await course_service.create_course(
        db,
        user_id=user.id,
        topic=topic,
        conversation_id=conversation_id,
        intake_json=None,
    )


async def generate_and_store_questionnaire(
    course_id: uuid.UUID, *, topic: str
) -> None:
    """Generate the profiling questionnaire and store it on the course.

    Runs on its OWN session as a protected background task (decoupled from the
    chat turn so it survives the client disconnecting). Any failure marks the
    course failed — the card stops polling and shows the failure instead of an
    endless skeleton — and never propagates out of the background task.
    """
    try:
        questionnaire = await generate_questionnaire(topic)
    except Exception:  # noqa: BLE001 — background task: any failure -> failed, never raise
        logger.exception("questionnaire generation failed for course %s", course_id)
        async with AsyncSessionLocal() as db:
            await course_service.mark_intake_failed(db, course_id=course_id)
        return
    async with AsyncSessionLocal() as db:
        await course_service.store_questionnaire(
            db, course_id=course_id, questionnaire=questionnaire.model_dump()
        )


async def submit_answers(
    db: AsyncSession,
    user: CurrentUser,
    *,
    course_id: uuid.UUID,
    answers: dict[str, str],
) -> CourseDetailOut | None:
    """Record answers, flip to `organizing`, enqueue the organize task.

    搜索前置: no outline is generated here — the broad search already ran (or is
    finishing) concurrently with the questionnaire; the organize Celery task gates
    on its completion, then composes (selects + organizes) over the cached pool.
    Returns the `organizing` snapshot (empty units) so the card streams progress.
    None -> 404 (IDOR).
    """
    course = await course_service.get_owned_course(
        db, user_id=user.id, course_id=course_id
    )
    if course is None:
        return None
    course.intake_json = {**(course.intake_json or {}), "answers": answers}
    course.status = _ORGANIZING
    await db.commit()
    # Lazy import: tasks import services, so importing at module top would cycle.
    from tasks.course_organize import organize_course

    organize_course.delay(str(course_id))
    return await course_service.get_course_detail(
        db, user_id=user.id, course_id=course_id
    )
