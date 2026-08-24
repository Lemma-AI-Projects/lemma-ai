"""阶段一冒烟：诉求 → 课程壳(intake) → 后台问卷 → 提交答案 → organizing。

跑法（backend/ 目录下）:
    uv run python tests/smoke_course_planning.py

service 层直测（绕过 HTTP 鉴权），真打 LLM，仿 smoke_projects 风格。
搜索前置状态机：create_course_shell -> intake -> generate_and_store_questionnaire
(受保护后台任务) -> submit_answers -> organizing（大纲由 Celery compose 生成，
本脚本只验证到 organizing 为止，不依赖 Celery worker）。
"""

import asyncio
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from ai import init_ai_runtime, shutdown_ai_runtime
from core.database import AsyncSessionLocal, engine
from core.security import CurrentUser
from models.ai_conversation import AiConversation
from models.course import CourseChapter, CourseUnit
from models.profile import Profile
from services import course_planning_service, course_service

FAILURES: list[str] = []


def check(condition: bool, label: str) -> None:
    status = "PASS" if condition else "FAIL"
    print(f"{status}  {label}")
    if not condition:
        FAILURES.append(label)


async def main() -> int:
    init_ai_runtime()
    try:
        async with AsyncSessionLocal() as s:
            profile = (await s.execute(select(Profile).limit(1))).scalar_one()
        user = CurrentUser(id=profile.id, email=profile.email)

        # 一条该用户的会话，用来验证 conversation_id 透传落库
        async with AsyncSessionLocal() as db:
            conversation = AiConversation(user_id=user.id, title="冒烟课程来源会话")
            db.add(conversation)
            await db.commit()
            await db.refresh(conversation)
            conversation_id = conversation.id

        # --- 1. plan：诉求 -> 课程壳(intake) + 后台问卷生成 ---
        async with AsyncSessionLocal() as db:
            course = await course_planning_service.create_course_shell(
                db, user, topic="我想学微积分", conversation_id=conversation_id
            )
            course_id = course.id
        check(course.status == "intake", "create_course_shell -> Course.status=intake")

        async with AsyncSessionLocal() as db:
            fresh = await course_service.get_owned_course(
                db, user_id=user.id, course_id=course_id
            )
            check(
                fresh is not None and fresh.conversation_id == conversation_id,
                "conversation_id 落库正确",
            )

        # 问卷在受保护后台任务生成（真打 LLM）；await 完成后读回
        await course_planning_service.generate_and_store_questionnaire(
            course_id, topic="我想学微积分"
        )
        async with AsyncSessionLocal() as db:
            questionnaire = await course_service.get_questionnaire(
                db, user_id=user.id, course_id=course_id
            )
        check(
            questionnaire is not None and len(questionnaire.questions) >= 1,
            "问卷非空 (>=1 题)",
        )
        check(
            all(len(q.options) >= 2 for q in questionnaire.questions),
            "每题 >=2 选项",
        )
        async with AsyncSessionLocal() as db:
            fresh = await course_service.get_owned_course(
                db, user_id=user.id, course_id=course_id
            )
            check(
                fresh is not None
                and bool(fresh.intake_json)
                and "questionnaire" in fresh.intake_json,
                "intake_json 含问卷产物",
            )

        # --- 2. intake：提交答案 -> organizing（搜索前置，大纲由 Celery compose） ---
        answers = {q.id: q.options[0] for q in questionnaire.questions}
        async with AsyncSessionLocal() as db:
            detail = await course_planning_service.submit_answers(
                db, user, course_id=course_id, answers=answers
            )
        check(detail is not None, "submit_answers 返回快照")
        assert detail is not None
        check(detail.status == "organizing", "intake -> status=organizing（搜索前置）")
        check(len(detail.units) == 0, "organizing 快照 units 为空（大纲在 Celery 生成）")

        async with AsyncSessionLocal() as db:
            fresh = await course_service.get_owned_course(
                db, user_id=user.id, course_id=course_id
            )
            check(
                fresh is not None and fresh.status == "organizing",
                "状态机落库 organizing",
            )
            check(
                fresh is not None and "answers" in (fresh.intake_json or {}),
                "intake_json 已 merge 答案",
            )

        # --- 3. <ready 的课程不进列表 ---
        async with AsyncSessionLocal() as db:
            listed = await course_service.list_courses(db, user_id=user.id)
            check(
                all(c.id != course_id for c in listed),
                "outline_ready 课程不在 list_courses (status<ready)",
            )

        # --- 4. IDOR 红线 ---
        stranger = uuid.uuid4()
        async with AsyncSessionLocal() as db:
            foreign = await course_service.get_owned_course(
                db, user_id=stranger, course_id=course_id
            )
            check(foreign is None, "他人 get_owned_course -> None (IDOR)")

        # --- 5. 清理：删课级联 units/chapters，再删测试会话 ---
        async with AsyncSessionLocal() as db:
            course = await course_service.get_owned_course(
                db, user_id=user.id, course_id=course_id
            )
            if course is not None:
                await course_service.delete_course(db, course)
        async with AsyncSessionLocal() as db:
            gone = await course_service.get_owned_course(
                db, user_id=user.id, course_id=course_id
            )
            check(gone is None, "课程已删除")
            left = (
                await db.execute(
                    select(CourseUnit).where(CourseUnit.course_id == course_id)
                )
            ).scalars().all()
            check(len(left) == 0, "级联: units 随课程删除")
            conversation = await db.get(AiConversation, conversation_id)
            if conversation is not None:
                await db.delete(conversation)
                await db.commit()
    finally:
        await shutdown_ai_runtime()
        await engine.dispose()

    print()
    if FAILURES:
        print(f"SMOKE FAILED: {len(FAILURES)} 项未过")
        return 1
    print("SMOKE OK: 课程阶段一 (plan/intake) 全链路通过")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
