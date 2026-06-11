"""Phase 2 冒烟：对话落库 + 会话 CRUD 全链路（service 层直测，绕过 HTTP 鉴权）。

跑法（backend/ 目录下）:
    uv run python scripts/smoke_chat_persistence.py

链路:
1. 新会话首轮 -> 标题生成 + user/assistant 成对落库 + raw_parts 附件轨
2. 第二轮带 conversationId -> 服务端历史重建，多轮上下文连贯
3. 第三轮中途 aclose()（模拟断连/停止生成）-> 部分回答落库 + 台账补记中断
4. 台账 conversation_id 回填验证
5. CRUD: list / rename / delete 级联清消息
"""

import asyncio
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import func, select

from ai import init_ai_runtime, shutdown_ai_runtime
from core.database import AsyncSessionLocal
from core.security import CurrentUser
from models.ai_conversation import AiMessage
from models.ai_usage_log import AiUsageLog
from models.profile import Profile
from schemas.ai import ChatMessageIn, ChatRequest
from services import conversation_service
from services.chat_service import prepare_turn, stream_turn

FAILURES: list[str] = []


def check(condition: bool, label: str) -> None:
    status = "PASS" if condition else "FAIL"
    print(f"{status}  {label}")
    if not condition:
        FAILURES.append(label)


async def run_turn(user: CurrentUser, content: str, conversation_id=None):  # noqa: ANN001
    """一轮完整对话；返回 (conversation_id, 拼接文本, 收到的事件种类)。"""
    async with AsyncSessionLocal() as db:
        context = await prepare_turn(
            db,
            ChatRequest(
                conversation_id=conversation_id,
                messages=[ChatMessageIn(role="user", content=content)],
            ),
            user,
        )
    assert context is not None
    text = ""
    kinds: list[str] = []
    async for chunk in stream_turn(context):
        kinds.append(chunk.kind)
        if chunk.kind == "delta" and chunk.text:
            text += chunk.text
    return context.conversation_id, text, kinds


async def run_interrupted_turn(user: CurrentUser, content: str, conversation_id):  # noqa: ANN001
    """消费两个 delta 后 aclose()，模拟「停止生成」。返回已收到的文本。"""
    async with AsyncSessionLocal() as db:
        context = await prepare_turn(
            db,
            ChatRequest(
                conversation_id=conversation_id,
                messages=[ChatMessageIn(role="user", content=content)],
            ),
            user,
        )
    assert context is not None
    gen = stream_turn(context)
    received = ""
    deltas = 0
    async for chunk in gen:
        if chunk.kind == "delta" and chunk.text:
            received += chunk.text
            deltas += 1
            if deltas >= 2:
                break
    await gen.aclose()
    return received


async def message_rows(conversation_id: uuid.UUID) -> list[AiMessage]:
    async with AsyncSessionLocal() as s:
        rows = await s.execute(
            select(AiMessage)
            .where(AiMessage.conversation_id == conversation_id)
            .order_by(AiMessage.created_at.asc())
        )
        return list(rows.scalars())


async def main() -> int:
    init_ai_runtime()
    try:
        async with AsyncSessionLocal() as s:
            profile = (await s.execute(select(Profile).limit(1))).scalar_one()
        user = CurrentUser(id=profile.id, email=profile.email)

        # --- 1. 新会话首轮 ---
        question1 = "我的幸运数字是 47，记住它。然后用一句话介绍勾股定理。"
        conv_id, text1, kinds = await run_turn(user, question1)
        check(bool(text1.strip()), "首轮回答非空")
        check(kinds[-2:] == ["usage", "done"], f"事件序以 usage,done 结尾 ({kinds[-2:]})")

        rows = await message_rows(conv_id)
        check(len(rows) == 2, f"首轮成对落库 user+assistant ({len(rows)} 行)")
        check(
            [r.role for r in rows] == ["user", "assistant"],
            "消息顺序 user -> assistant",
        )
        check(rows[1].content_text == text1, "assistant content_text 与流式拼接一致")
        check(
            (rows[1].raw_parts_json or {}).get("schema") == "pydantic_ai/v1",
            "raw_parts_json 附件轨带 schema 标记",
        )
        check(rows[0].raw_parts_json is None, "user 消息无附件轨")

        async with AsyncSessionLocal() as s:
            conv = await conversation_service.get_owned_conversation(
                s, user_id=user.id, conversation_id=conv_id
            )
        check(conv is not None and conv.title == "我的幸运数字是 47，记住它。然后用一句话介绍勾股定理。"[:50], f"标题取首问前50字 ({conv.title!r})")

        # --- 2. 第二轮：服务端历史重建 ---
        _, text2, _ = await run_turn(user, "我的幸运数字是多少？只回答数字。", conv_id)
        check("47" in text2, f"多轮上下文连贯：服务端历史生效 ({text2[:40]!r})")
        rows = await message_rows(conv_id)
        check(len(rows) == 4, f"第二轮后共 4 条消息 ({len(rows)})")

        # --- 3. 中断轮：部分回答落库 ---
        partial = await run_interrupted_turn(
            user, "用十句话详细讲讲微积分的历史。", conv_id
        )
        rows = await message_rows(conv_id)
        check(len(rows) == 6, f"中断轮也成对落库 ({len(rows)} 行)")
        check(
            rows[-1].role == "assistant" and rows[-1].content_text == partial,
            "部分回答保存的恰为已吐出的文本",
        )
        check(rows[-1].raw_parts_json is None, "中断轮无附件轨（无完整框架消息）")

        async with AsyncSessionLocal() as s:
            interrupted = (
                await s.execute(
                    select(func.count())
                    .select_from(AiUsageLog)
                    .where(
                        AiUsageLog.conversation_id == conv_id,
                        AiUsageLog.error_type == "stream_interrupted",
                    )
                )
            ).scalar_one()
            linked = (
                await s.execute(
                    select(func.count())
                    .select_from(AiUsageLog)
                    .where(AiUsageLog.conversation_id == conv_id)
                )
            ).scalar_one()
        check(interrupted == 1, f"台账补记 stream_interrupted ({interrupted} 行)")
        check(linked >= 3, f"台账 conversation_id 回填 ({linked} 行关联本会话)")

        # --- 4. 越权红线 ---
        stranger = CurrentUser(id=uuid.uuid4(), email=None)
        async with AsyncSessionLocal() as s:
            foreign = await conversation_service.get_owned_conversation(
                s, user_id=stranger.id, conversation_id=conv_id
            )
        check(foreign is None, "他人会话不可见（IDOR 防线）")

        # --- 5. CRUD ---
        async with AsyncSessionLocal() as s:
            listed = await conversation_service.list_conversations(s, user_id=user.id)
            check(any(c.id == conv_id for c in listed), "list 包含本会话")
            conv = await conversation_service.get_owned_conversation(
                s, user_id=user.id, conversation_id=conv_id
            )
            renamed = await conversation_service.rename_conversation(
                s, conv, title="勾股定理与幸运数字"
            )
            check(renamed.title == "勾股定理与幸运数字", "rename 生效")
            await conversation_service.delete_conversation(s, renamed)

        rows = await message_rows(conv_id)
        check(len(rows) == 0, "delete 级联清空消息")
        async with AsyncSessionLocal() as s:
            gone = await conversation_service.get_owned_conversation(
                s, user_id=user.id, conversation_id=conv_id
            )
        check(gone is None, "会话已删除")
    finally:
        await shutdown_ai_runtime()

    print()
    if FAILURES:
        print(f"SMOKE FAILED: {len(FAILURES)} 项未过")
        return 1
    print("SMOKE OK: 对话落库 + CRUD 全链路通过")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
