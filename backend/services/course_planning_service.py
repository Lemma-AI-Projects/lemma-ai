"""阶段一 orchestration: 诉求 -> 问卷 -> (答案) -> 大纲落库.

Composes ai/coursegen (the LLM brain) with course_service (persistence); it
never touches the ORM directly. State machine this phase: create_course_shell ->
intake (questionnaire filled in async), submit_answers -> outline_ready (building
is Phase 5).

异步取舍 (rules 第九章): the outline LLM call (submit_answers) is INTERACTIVE
generation the user is actively waiting on, so it runs synchronously in-request
(no Celery), same as the chat endpoint. The questionnaire is different: the chat
tool turn wants the course id immediately (to attach the card and persist the
turn), so generation is split off — create_course_shell returns at once and
generate_and_store_questionnaire runs on a protected background task (still the
API process, not Celery). Neither is fire-and-forget work for Celery.
"""

import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from ai.coursegen import generate_outline, generate_questionnaire
from core.database import AsyncSessionLocal
from core.security import CurrentUser
from models.course import Course
from schemas.course import CourseDetailOut
from services import course_service

logger = logging.getLogger("lemma.services.course_planning")


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
    """Merge answers, generate the outline, persist it. None -> 404 (IDOR)."""
    course = await course_service.get_owned_course(
        db, user_id=user.id, course_id=course_id
    )
    if course is None:
        return None
    intake_json = {**(course.intake_json or {}), "answers": answers}
    outline = await generate_outline(course.topic, answers)
    await course_service.persist_outline(db, course, outline, intake_json=intake_json)
    return await course_service.get_course_detail(
        db, user_id=user.id, course_id=course_id
    )
