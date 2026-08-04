"""Project 域冒烟：建项目 → 项目内发起会话 → 列表/预览 → 移入移出 → 删项目回落。

跑法（backend/ 目录下）:
    uv run python tests/smoke_projects.py

service 层直测（绕过 HTTP 鉴权），与 smoke_chat_persistence 同款风格。
"""

import asyncio
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from ai import init_ai_runtime, shutdown_ai_runtime
from core.aio import drain_protected_writes
from core.database import AsyncSessionLocal
from core.security import CurrentUser
from models.profile import Profile
from schemas.ai import ChatMessageIn, ChatRequest
from services import conversation_service, project_service
from services.chat_service import prepare_turn, stream_turn

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

        # --- 1. 项目 CRUD ---
        async with AsyncSessionLocal() as db:
            project = await project_service.create_project(
                db, user_id=user.id, name="冒烟测试项目"
            )
            listed = await project_service.list_projects(db, user_id=user.id)
            check(any(p.id == project.id for p in listed), "create + list 项目")
            renamed = await project_service.rename_project(
                db, project, name="冒烟测试项目改名"
            )
            check(renamed.name == "冒烟测试项目改名", "rename 项目")

        # --- 2. 项目内发起新会话（全链路：归属校验 -> 流式 -> 落库带归属）---
        question = "用一句话回答：什么是项目制学习？"
        async with AsyncSessionLocal() as db:
            ctx = await prepare_turn(
                db,
                ChatRequest(
                    project_id=project.id,
                    messages=[ChatMessageIn(role="user", content=question)],
                ),
                user,
            )
        assert ctx is not None
        check(ctx.new_conversation_project_id == project.id, "TurnContext 携带项目归属")
        async for _ in stream_turn(ctx):
            pass
        await drain_protected_writes()

        async with AsyncSessionLocal() as db:
            conv = await conversation_service.get_owned_conversation(
                db, user_id=user.id, conversation_id=ctx.conversation_id
            )
            check(
                conv is not None and conv.project_id == project.id,
                "新会话落库且归属项目",
            )

            main_list = await conversation_service.list_conversations(
                db, user_id=user.id
            )
            check(
                all(c.id != ctx.conversation_id for c in main_list),
                "主列表不含项目内会话",
            )

            project_list = await conversation_service.list_project_conversations(
                db, project_id=project.id
            )
            check(
                len(project_list) == 1
                and project_list[0][0].id == ctx.conversation_id
                and project_list[0][1] == question,
                f"项目内列表含该会话且预览=最后一条用户消息",
            )

        # --- 3. 移出 / 移入 ---
        async with AsyncSessionLocal() as db:
            conv = await conversation_service.get_owned_conversation(
                db, user_id=user.id, conversation_id=ctx.conversation_id
            )
            moved_out = await conversation_service.set_conversation_project(
                db, conv, project_id=None
            )
            check(moved_out.project_id is None, "移出项目")
            main_list = await conversation_service.list_conversations(
                db, user_id=user.id
            )
            check(
                any(c.id == ctx.conversation_id for c in main_list),
                "移出后回到主列表",
            )
            moved_in = await conversation_service.set_conversation_project(
                db, moved_out, project_id=project.id
            )
            check(moved_in.project_id == project.id, "移回项目")

        # --- 4. 越权红线 ---
        stranger = CurrentUser(id=uuid.uuid4(), email=None)
        async with AsyncSessionLocal() as db:
            foreign = await project_service.get_owned_project(
                db, user_id=stranger.id, project_id=project.id
            )
            check(foreign is None, "他人项目不可见")
            ctx_foreign = await prepare_turn(
                db,
                ChatRequest(
                    project_id=project.id,
                    messages=[ChatMessageIn(role="user", content="蹭项目")],
                ),
                stranger,
            )
            check(ctx_foreign is None, "用他人项目 id 发起会话被拒（404 路径）")

        # --- 5. 删项目：会话回落不删除 ---
        async with AsyncSessionLocal() as db:
            proj = await project_service.get_owned_project(
                db, user_id=user.id, project_id=project.id
            )
            await project_service.delete_project(db, proj)
        async with AsyncSessionLocal() as db:
            gone = await project_service.get_owned_project(
                db, user_id=user.id, project_id=project.id
            )
            check(gone is None, "项目已删除")
            conv = await conversation_service.get_owned_conversation(
                db, user_id=user.id, conversation_id=ctx.conversation_id
            )
            check(
                conv is not None and conv.project_id is None,
                "会话存活且回落主列表（SET NULL 生效）",
            )
            # 清理测试会话
            if conv is not None:
                await conversation_service.delete_conversation(db, conv)
    finally:
        await shutdown_ai_runtime()

    print()
    if FAILURES:
        print(f"SMOKE FAILED: {len(FAILURES)} 项未过")
        return 1
    print("SMOKE OK: 项目域全链路通过")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
