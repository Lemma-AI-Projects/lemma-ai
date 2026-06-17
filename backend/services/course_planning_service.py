"""阶段一 orchestration: 诉求 -> 问卷 -> (答案) -> 大纲落库.

Composes ai/coursegen (the LLM brain) with course_service (persistence); it
never touches the ORM directly. State machine this phase: create_plan -> intake,
submit_answers -> outline_ready (building is Phase 5).

异步取舍 (rules 第九章): the questionnaire/outline LLM calls can exceed 2s, but
they are INTERACTIVE generation the user is actively waiting on — same as the
existing chat endpoint running the model inside the request. Per the拍板 these
return synchronously (no Celery). The long-task -> Celery rule applies to
fire-and-forget work (阶段二 course building), not to in-request generation.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from ai.coursegen import generate_outline, generate_questionnaire
from ai.coursegen.types import Questionnaire
from core.security import CurrentUser
from models.course import Course
from schemas.course import CourseDetailOut
from services import course_service


async def create_plan(
    db: AsyncSession,
    user: CurrentUser,
    *,
    topic: str,
    conversation_id: uuid.UUID | None,
) -> tuple[Course, Questionnaire]:
    """Generate the profiling questionnaire and persist a fresh intake course.

    The questionnaire is stored in intake_json so /courses/plan can echo it and
    submit_answers can merge the answers alongside it later.
    """
    questionnaire = await generate_questionnaire(topic)
    course = await course_service.create_course(
        db,
        user_id=user.id,
        topic=topic,
        conversation_id=conversation_id,
        intake_json={"questionnaire": questionnaire.model_dump()},
    )
    return course, questionnaire


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
