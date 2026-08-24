"""Phase 2 冒烟：对话落库 + 会话 CRUD 全链路（service 层直测，绕过 HTTP 鉴权）。

跑法（backend/ 目录下）:
    uv run python tests/smoke_chat_persistence.py

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

import anyio

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import func, select

from ai import init_ai_runtime, shutdown_ai_runtime
from core.aio import drain_protected_writes
from core.database import AsyncSessionLocal, engine
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

        # --- 0. 空会话防线：prepare 只发 id 不落行 ---
        async with AsyncSessionLocal() as db:
            ghost_ctx = await prepare_turn(
                db,
                ChatRequest(
                    messages=[ChatMessageIn(role="user", content="这轮永远不会被发送")]
                ),
                user,
            )
        assert ghost_ctx is not None
        async with AsyncSessionLocal() as s:
            ghost = await conversation_service.get_owned_conversation(
                s, user_id=user.id, conversation_id=ghost_ctx.conversation_id
            )
        check(ghost is None, "新会话在首轮产出前不存在（首字前失败无空会话残留）")

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
        check(rows[0].reasoning_text is None, "user 消息无 reasoning 轨")
        check(
            rows[1].reasoning_text is None
            or isinstance(rows[1].reasoning_text, str),
            "assistant reasoning_text 独立列可为空或为文本",
        )

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
        check(
            rows[-1].reasoning_text is None
            or isinstance(rows[-1].reasoning_text, str),
            "中断轮 reasoning_text 不影响部分正文落库",
        )

        # 台账成功行现在走受保护后台任务，先排空再认账
        await drain_protected_writes()
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

        # --- 3b. 浏览器竞态：done 不等落库，立刻续聊必须被宽限重试兜住 ---
        # done 即时送达（按钮立刻解锁），写在受保护后台任务上在途；
        # 新会话的行可能尚未可见——prepare_turn 的在途宽限重试是兜底
        # （2026-06-12 真实 bug + 尾延迟优化的回归项）。
        async with AsyncSessionLocal() as db:
            ctx_b = await prepare_turn(
                db,
                ChatRequest(
                    messages=[ChatMessageIn(role="user", content="用一个词回答：好")]
                ),
                user,
            )
        assert ctx_b is not None
        gen_b = stream_turn(ctx_b)
        done_seen = False
        async for chunk in gen_b:
            if chunk.kind == "done":
                done_seen = True
                break  # 模拟浏览器：见到 done 即不再读
        check(done_seen, "3b 收到 done 事件")
        # 不等任何排空，立刻用刚拿到的 id 续聊（最坏竞态）
        async with AsyncSessionLocal() as db:
            ctx_race = await prepare_turn(
                db,
                ChatRequest(
                    conversation_id=ctx_b.conversation_id,
                    messages=[ChatMessageIn(role="user", content="再答一次")],
                ),
                user,
            )
        check(
            ctx_race is not None and len(ctx_race.history) == 2,
            "3b done 后立刻续聊不 404，历史完整（在途写宽限生效）",
        )
        await gen_b.aclose()
        await drain_protected_writes()
        rows_b = await message_rows(ctx_b.conversation_id)
        check(len(rows_b) == 2, f"3b 新会话成对落库（{len(rows_b)} 行）")
        async with AsyncSessionLocal() as s:
            conv_b = await conversation_service.get_owned_conversation(
                s, user_id=user.id, conversation_id=ctx_b.conversation_id
            )
            if conv_b is not None:
                await conversation_service.delete_conversation(s, conv_b)

        # --- 3c. anyio 风格中途断连：取消风暴下部分回答仍落库 ---
        # starlette/uvicorn 在客户端断开后用 anyio cancel scope 取消响应任务，
        # 此后每个 await 都会再次抛取消——受保护后台写必须在这种环境下存活。
        async with AsyncSessionLocal() as db:
            ctx_c = await prepare_turn(
                db,
                ChatRequest(
                    conversation_id=conv_id,
                    messages=[
                        ChatMessageIn(role="user", content="用十句话讲讲圆周率的历史。")
                    ],
                ),
                user,
            )
        assert ctx_c is not None
        received_c = ""
        deltas_c = 0
        with anyio.CancelScope() as scope:
            async for chunk in stream_turn(ctx_c):
                if chunk.kind == "delta" and chunk.text:
                    received_c += chunk.text
                    deltas_c += 1
                    if deltas_c >= 2:
                        scope.cancel()
        await asyncio.sleep(1.5)  # 异步生成器终结器需要时间触发
        await drain_protected_writes()
        rows = await message_rows(conv_id)
        check(len(rows) == 8, f"取消风暴下中断轮成对落库（{len(rows)} 行，期望 8）")
        check(
            rows[-1].role == "assistant" and rows[-1].content_text == received_c,
            "3c 部分回答内容与已收到的增量一致",
        )
        async with AsyncSessionLocal() as s:
            interrupted2 = (
                await s.execute(
                    select(func.count())
                    .select_from(AiUsageLog)
                    .where(
                        AiUsageLog.conversation_id == conv_id,
                        AiUsageLog.error_type == "stream_interrupted",
                    )
                )
            ).scalar_one()
        check(interrupted2 == 2, f"3c 台账补记中断（共 {interrupted2} 行，期望 2）")

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
        await engine.dispose()

    print()
    if FAILURES:
        print(f"SMOKE FAILED: {len(FAILURES)} 项未过")
        return 1
    print("SMOKE OK: 对话落库 + CRUD 全链路通过")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
