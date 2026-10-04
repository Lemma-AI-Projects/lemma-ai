"""R2 · 「我帮过忙」可记录 —— 真库，直接查行。

核心 `ai/knowledge/state.py:291` 早就只认
`independent and not hint_used`，而 `knowledge_evidence.hint_used` 这一列、
`schemas/knowledge.py` 的契约、`evidence_entry.Outcome` 的字段**全都已经在了**。
缺的只有一处：**教人的那个模型没有语法说"我提示过"**。

所以这个模块只验一件事，而且验在**库**上而不是纯函数上：

> 一次带提示的正确作答会写进库，但**不改变** Learner State；
> 一次独立的正确作答会改变。两者在库里可区分。

写成 DB 测试而不是纯函数测试，是因为那个区分此前只在 `ai/knowledge/test_state.py`
里对着手工构造的 `Evidence` 存在过 —— 从**工具参数**到**列**的那一段接线没人验。
一个 `hint_used=True` 在 handler 里被丢掉，419 个测试会全绿。
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid

import pytest
from sqlalchemy import text

from ai.tools import ToolCall, ToolResult
from core.database import AsyncSessionLocal, engine
from services import knowledge_service
from services.conversation_tool_service import build_global_tools

from ai import RECORD_EVIDENCE

ITEM = "换元后的上下限"


def run(coro):
    """asyncio.run with the pool drained on both sides (see test_learner_state_db)."""

    async def wrapper():
        with contextlib.suppress(Exception):
            await engine.dispose()
        try:
            return await coro
        finally:
            with contextlib.suppress(Exception):
                await engine.dispose()

    return asyncio.run(wrapper())


@pytest.fixture(scope="module")
def space():
    async def _probe():
        async with engine.connect() as conn:
            await conn.execute(text("select 1"))

    try:
        run(_probe())
    except Exception as exc:  # noqa: BLE001
        pytest.skip(f"no database reachable: {type(exc).__name__}: {exc}")

    ids = run(_create_space())
    run(_seed_structure(ids))
    yield ids
    run(_drop_space(ids[0]))


async def _create_space() -> tuple[uuid.UUID, uuid.UUID]:
    user_id, project_id = uuid.uuid4(), uuid.uuid4()
    email = f"hint-used-test-{user_id}@example.test"
    async with engine.begin() as conn:
        await conn.execute(
            text("insert into auth.users (id, email) values (:id, :email)"),
            {"id": user_id, "email": email},
        )
        await conn.execute(
            text("insert into profiles (id, email, avatar_color) values (:id, :email, :c)"),
            {"id": user_id, "email": email, "c": "#000000"},
        )
        await conn.execute(
            text("insert into projects (id, user_id, name) values (:id, :u, :n)"),
            {"id": project_id, "u": user_id, "n": "hint-used-test-space"},
        )
    return user_id, project_id


async def _seed_structure(ids) -> None:
    from schemas.knowledge import KnowledgeImportIn

    _, project_id = ids
    payload = KnowledgeImportIn.model_validate(
        {"items": [{"ref": "i0", "label": ITEM}], "edges": []}
    )
    async with AsyncSessionLocal() as db:
        await knowledge_service.import_structure(
            db, project_id=project_id, payload=payload
        )


async def _drop_space(user_id: uuid.UUID) -> None:
    async with engine.begin() as conn:
        await conn.execute(text("delete from auth.users where id = :id"), {"id": user_id})


def _record_via_tool(user_id, project_id, **args) -> dict:
    """Write one piece of evidence **through the Agent tool**, not the service.

    That is the whole point: the seam under test is `hintUsed` (tool argument) →
    `Outcome` → column. Calling `knowledge_service.record_evidence` directly
    would skip the only part that was actually broken.
    """
    tools = build_global_tools(
        user_id=user_id, conversation_id=None, project_id=project_id
    )
    handler = next(b.handler for b in tools if b.spec.name == RECORD_EVIDENCE)
    call = ToolCall(name=RECORD_EVIDENCE, args=args)

    async def _first():
        async for item in handler(call):
            if isinstance(item, ToolResult):
                return item.response
        raise AssertionError("handler produced no result")

    return run(_first())


def _state_of(user_id, project_id) -> str:
    """The item's derived value, as the prompt and the panel would see it."""

    async def _read():
        async with AsyncSessionLocal() as db:
            state, _fringes, items, _ = await knowledge_service.compute_state(
                db, project_id=project_id, user_id=user_id
            )
        by_label = {row.label: str(row.id) for row in items}
        return state.value(by_label[ITEM]).value

    return run(_read())


def _rows(user_id, project_id) -> list[tuple[str, bool, bool]]:
    """(verdict, independent, hint_used) oldest first — read straight from the table."""

    async def _read():
        async with engine.connect() as conn:
            result = await conn.execute(
                text(
                    "select verdict, independent, hint_used from knowledge_evidence "
                    "where project_id = :p and user_id = :u order by created_at"
                ),
                {"p": project_id, "u": user_id},
            )
            return [tuple(row) for row in result.all()]

    return run(_read())


def test_a_helped_success_is_recorded_but_does_not_move_the_state(space):
    """⭐ 一次带提示的答对：写进库，`hint_used=True`，状态**不变**。

    这是整个 R2 的意义所在。系统此前会在无意中**夸大学习者的独立性** ——
    不是因为它算错了，而是因为那个事实没有被记下来。
    """
    user_id, project_id = space
    before = _state_of(user_id, project_id)

    response = _record_via_tool(
        user_id,
        project_id,
        item=ITEM,
        verdict="correct",
        basis="verified",
        reasoning="答案 2 核对过",
        hintUsed=True,
    )
    assert response.get("status") != "rejected", response

    rows = _rows(user_id, project_id)
    assert len(rows) == 1
    verdict, independent, hint_used = rows[0]
    assert verdict == "correct"
    assert hint_used is True, "工具声明了带提示，库里却没有 —— 接线断了"
    # 核心的规则是 `independent and not hint_used`（`state.py:291`）——
    # **两个都要**。工具只填了 `hint_used`，`independent` 留在这个契约的默认值
    # `True` 上，所以真正让这条不计入的是 `hint_used`。这值得钉住：若哪天有人
    # 把 `independent` 的默认值翻成 False，那**所有**记录都会变成 INERT，而症状
    # 是"学习状态永远不动" —— 一个看不出原因的方向。
    assert independent is True, "independent 的默认值被翻了 —— 所有记录会静默变成 INERT"
    assert _state_of(user_id, project_id) == before, (
        "带提示的成功改变了掌握状态 —— 那正是我们要避免的那件事"
    )


def test_an_unassisted_success_moves_the_state(space):
    """对照：同一条路径，`hintUsed=False` ⇒ 状态真的变。

    两条测试合起来才是那条主张：**库分得清"他做到"与"我们扶着他做到"**。
    """
    user_id, project_id = space
    before = _state_of(user_id, project_id)

    response = _record_via_tool(
        user_id,
        project_id,
        item=ITEM,
        verdict="correct",
        basis="verified",
        reasoning="答案 2 核对过",
        hintUsed=False,
    )
    assert response.get("status") != "rejected", response

    rows = _rows(user_id, project_id)
    assert len(rows) == 2, "上一条测试写的行不见了"
    assert rows[1][2] is False, "独立成功被记成了带提示"
    assert rows[1][1] is True
    assert _state_of(user_id, project_id) != before, (
        "独立成功没有改变状态 —— 那说明 INERT 与 COUNTS 的区分在库这一层丢了"
    )


def test_a_missing_hint_used_is_read_as_helped_not_as_independent(space):
    """⚠️ 漏报帮助 ⇒ 当成**帮过**（INERT），不是当成独立成功。

    工具 schema 把 `hintUsed` 列为 required，但一个漏发的模型说的是「我什么也没说」，
    不是「他独自做到了」。默认 `False` 会把每次漏报变成一次独立成功 —— 而那
    正是核心唯一会计算的那一种，于是学习者的状态会毫无迹象地虚高。

    少算一次成功的代价远小于多算一次。
    """
    user_id, project_id = space
    before = _state_of(user_id, project_id)

    response = _record_via_tool(
        user_id,
        project_id,
        item=ITEM,
        verdict="correct",
        basis="verified",
        reasoning="答案 2 核对过",
        # hintUsed 故意不给
    )
    assert response.get("status") != "rejected", response
    assert _rows(user_id, project_id)[-1][2] is True, "漏报被当成了独立成功"
    assert _state_of(user_id, project_id) == before


def test_the_snapshot_carries_hint_used_to_the_decision_layer(space):
    """第三处接线：选择层必须看得见这件事，否则前两处白做。

    只改工具与库，快照里仍然只有 "correct, correct, correct" —— 决策层看不出
    哪一个是自己走出来的，于是它只能按答对次数反应，而那正是帮助在干活时最
    漂亮的一个信号。
    """
    from ai.coordinator import SOURCE_CHAT, CoordinatorEvent
    from core.database import AsyncSessionLocal
    from services import coordinator_service

    user_id, project_id = space

    async def _snapshot():
        async with AsyncSessionLocal() as db:
            return await coordinator_service.build_snapshot(
                db,
                user_id=user_id,
                event=CoordinatorEvent(
                    type="learner_state.updated", source=SOURCE_CHAT
                ),
                project_id=project_id,
            )

    snapshot = run(_snapshot())
    assert snapshot.recent_evidence, "快照里一条证据都没有 —— 夹具不对"
    hint_flags = [fact.hint_used for fact in snapshot.recent_evidence]
    assert True in hint_flags, "带提示的那条没进快照（或 hint_used 在装配时丢了）"
    assert False in hint_flags, "独立的那条没进快照"
