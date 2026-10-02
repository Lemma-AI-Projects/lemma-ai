"""Focus 顶部那颗 method 状态栏的数据源（`GET /api/v1/methods/status`）。

四条断言，每一条都是产品承诺：

  * **它是动词，不是术语** —— 响应体里**没有 method 的名字**（一个 name 字段都没
    有）。这不是"前端记得别显示"，是**结构上做不到违反**：少一个字段，界面就少
    一种做错的方式。
  * **目标决定了"什么算完成"** —— 同一个空间，只把目标的 purpose 从理解改成考试，
    四格里的第三格就变了。这是"目标真的进了运行时"在界面上看得见的那一半。
  * **没有目标时不说和目标的关系** —— 那一格是 `null`，而不是一句通用的"和目标有关"。
  * **拒绝要明确** —— 别人的空间 404；别人的会话、或不属于这个空间的会话，同样 404。

Auth is the only thing faked (a `CurrentUser` in place of a token).
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from core.database import AsyncSessionLocal, engine, get_db
from core.security import CurrentUser, get_current_user
from main import app

STATUS = "/api/v1/methods/status"
GOALS = "/api/v1/projects"


def run(coro):
    """asyncio.run with the pool drained on both sides. Fixture-only — never
    inside a `with act_as(...)` block (see test_user_home_api)."""

    async def wrapper():
        with contextlib.suppress(Exception):
            await engine.dispose()
        try:
            return await coro
        finally:
            with contextlib.suppress(Exception):
                await engine.dispose()

    return asyncio.run(wrapper())


async def _create() -> tuple[uuid.UUID, uuid.UUID, uuid.UUID, uuid.UUID]:
    """(user_a, user_b, space_a, conversation_a) — one space with one socratic chat."""
    user_a, user_b, space_a, conversation_a = (uuid.uuid4() for _ in range(4))
    async with engine.begin() as conn:
        for user_id, tag in ((user_a, "a"), (user_b, "b")):
            email = f"mstatus-{tag}-{user_id}@example.test"
            await conn.execute(
                text("insert into auth.users (id, email) values (:id, :email)"),
                {"id": user_id, "email": email},
            )
            await conn.execute(
                text(
                    "insert into profiles (id, email, avatar_color) "
                    "values (:id, :email, :color)"
                ),
                {"id": user_id, "email": email, "color": "#000000"},
            )
        await conn.execute(
            text("insert into projects (id, user_id, name) values (:id, :u, :n)"),
            {"id": space_a, "u": user_a, "n": "TOEFL 冲刺"},
        )
        # 这个空间最近教过的那一段用的是 socratic（默认是 direct_explanation，
        # 所以这一行有用：状态栏要跟着"这个空间现在在被怎么教"）。
        await conn.execute(
            text(
                "insert into ai_conversations (id, user_id, project_id, title, method) "
                "values (:id, :u, :p, :t, :m)"
            ),
            {
                "id": conversation_a,
                "u": user_a,
                "p": space_a,
                "t": "冲刺计划",
                "m": "socratic",
            },
        )
    return user_a, user_b, space_a, conversation_a


async def _drop(*user_ids: uuid.UUID) -> None:
    async with engine.begin() as conn:
        for user_id in user_ids:
            await conn.execute(
                text("delete from auth.users where id = :id"), {"id": user_id}
            )


@pytest.fixture
def world():
    async def _probe():
        async with engine.connect() as conn:
            await conn.execute(text("select 1"))

    try:
        run(_probe())
    except Exception as exc:  # noqa: BLE001 — any failure means "no database here"
        pytest.skip(f"no database reachable: {type(exc).__name__}: {exc}")

    ids = run(_create())
    yield ids
    run(_drop(ids[0], ids[1]))


@pytest.fixture
def act_as():
    def _open(user_id: uuid.UUID) -> TestClient:
        async def _session():
            async with AsyncSessionLocal() as session:
                yield session

        app.dependency_overrides[get_current_user] = lambda: CurrentUser(
            id=user_id, email=None
        )
        app.dependency_overrides[get_db] = _session
        return TestClient(app, raise_server_exceptions=False)

    yield _open
    app.dependency_overrides.clear()


def _set_goal(client: TestClient, space_id: uuid.UUID, purpose: str) -> None:
    """建一个目标并确认 —— 只有确认过的才会进状态栏。"""
    created = client.post(
        f"{GOALS}/{space_id}/goals",
        json={
            "targetText": "考到 TOEFL 117 分" if purpose == "exam_performance" else "真正学懂它",
            "deadlineAt": (datetime.now(UTC) + timedelta(days=61)).isoformat(),
            "context": "TOEFL",
            "purpose": purpose,
        },
    )
    assert created.status_code == 201, created.text
    confirmed = client.post(f"{GOALS}/{space_id}/goals/{created.json()['id']}/confirm")
    assert confirmed.status_code == 200, confirmed.text


def _status(client: TestClient, space_id: uuid.UUID) -> dict:
    response = client.get(STATUS, params={"projectId": str(space_id)})
    assert response.status_code == 200, response.text
    return response.json()


# --- 它是动词，不是术语 ------------------------------------------------------


def test_the_wire_carries_no_method_name(world, act_as):
    """"不显示 Method 的名字"在界面这一侧是**结构上做不到违反**的 —— 后端就不发。"""
    user_a, _user_b, space_a, _chat = world
    with act_as(user_a) as client:
        body = _status(client, space_a)
        assert set(body) == {
            "systemMove",
            "learnerMove",
            "completion",
            "goalRelation",
        }
        assert "socratic" not in str(body)


def test_it_reads_the_method_this_space_is_currently_taught_with(world, act_as):
    """空间最近一段会话用的是 socratic，所以四格是 socratic 那一套，不是默认那套。"""
    user_a, _user_b, space_a, _chat = world
    with act_as(user_a) as client:
        body = _status(client, space_a)
        # socratic 的"在做什么"是"先请你自己走一遍"；默认（direct_explanation）
        # 是"我把这一步讲清楚"。
        assert body["systemMove"] == "先请你自己走一遍"

        # 指定那一段会话，结果一样（它就是最近那一段）。
        same = client.get(
            STATUS,
            params={"projectId": str(space_a), "conversationId": str(_chat)},
        )
        assert same.status_code == 200
        assert same.json() == body


async def _add_conversation(
    *, user_id: uuid.UUID, project_id: uuid.UUID | None, method: str, title: str
) -> uuid.UUID:
    """插一段会话（真库），用来验证"状态栏跟着哪一段走"。"""
    conversation_id = uuid.uuid4()
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "insert into ai_conversations "
                "(id, user_id, project_id, title, method, updated_at) "
                "values (:id, :u, :p, :t, :m, :now)"
            ),
            {
                "id": conversation_id,
                "u": user_id,
                "p": project_id,
                "t": title,
                "m": method,
                "now": datetime.now(UTC),
            },
        )
    return conversation_id


def test_a_named_conversation_wins(world, act_as):
    """点名哪一段就跟着哪一段；不点名则跟着**最近**那一段。"""
    user_a, _user_b, space_a, chat_a = world
    # 先插好，再开客户端 —— `run()` 不能跑在 TestClient 的块里（事件循环的规矩）。
    other = run(
        _add_conversation(
            user_id=user_a,
            project_id=space_a,
            method="direct_explanation",
            title="新的一段",
        )
    )
    with act_as(user_a) as client:
        named = client.get(
            STATUS,
            params={"projectId": str(space_a), "conversationId": str(chat_a)},
        ).json()
        assert named["systemMove"] == "先请你自己走一遍"

        latest = _status(client, space_a)
        assert latest["systemMove"] == "我把这一步讲清楚"
        assert other != chat_a


# --- 目标决定"什么算完成" ----------------------------------------------------


def test_no_goal_means_no_relation_written(world, act_as):
    """没有目标就不说和目标的关系 —— 而不是说一句通用的"和目标有关"。"""
    user_a, _user_b, space_a, _chat = world
    with act_as(user_a) as client:
        body = _status(client, space_a)
        assert body["goalRelation"] is None
        assert body["completion"]  # 判据仍然有：这一轮要成什么

        # 未确认的目标不算数（它是某个人——包括系统——的猜测）。
        created = client.post(
            f"{GOALS}/{space_a}/goals",
            json={"targetText": "考到 117", "purpose": "exam_performance"},
        )
        assert created.status_code == 201
        assert _status(client, space_a)["goalRelation"] is None


def test_the_purpose_changes_what_counts_as_done(world, act_as):
    """⭐ 同一个空间，只改 purpose，第三格（什么算完成）必须不同。"""
    user_a, _user_b, space_a, _chat = world
    with act_as(user_a) as client:
        _set_goal(client, space_a, "exam_performance")
        exam = _status(client, space_a)
        assert "做对两道" in exam["completion"]
        assert exam["goalRelation"] is not None

        # 关掉它，换一个"为了理解"的目标。
        listed = client.get(f"{GOALS}/{space_a}/goals").json()
        client.post(
            f"{GOALS}/{space_a}/goals/{listed[0]['id']}/close",
            json={"reason": "user_superseded"},
        )
        _set_goal(client, space_a, "understanding")
        understanding = _status(client, space_a)

        assert understanding["completion"] != exam["completion"]
        assert "为什么" in understanding["completion"]
        assert understanding["goalRelation"] != exam["goalRelation"]


def test_pausing_takes_the_relation_away(world, act_as):
    user_a, _user_b, space_a, _chat = world
    with act_as(user_a) as client:
        _set_goal(client, space_a, "exam_performance")
        assert _status(client, space_a)["goalRelation"] is not None

        goal_id = client.get(f"{GOALS}/{space_a}/goals/active").json()["id"]
        client.post(f"{GOALS}/{space_a}/goals/{goal_id}/pause")
        assert _status(client, space_a)["goalRelation"] is None


# --- 拒绝要明确 --------------------------------------------------------------


def test_another_persons_space_is_a_404(world, act_as):
    _user_a, user_b, space_a, _chat = world
    with act_as(user_b) as client:
        assert client.get(STATUS, params={"projectId": str(space_a)}).status_code == 404


def test_a_conversation_that_is_not_theirs_or_not_this_space_is_a_404(world, act_as):
    user_a, user_b, space_a, _chat = world
    stranger = run(
        _add_conversation(
            user_id=user_b,
            project_id=None,
            method="socratic",
            title="b 的",
        )
    )
    with act_as(user_a) as client:
        # b 的会话、或者一个不属于这个空间的会话 —— 都当作不存在。
        assert (
            client.get(
                STATUS,
                params={"projectId": str(space_a), "conversationId": str(stranger)},
            ).status_code
            == 404
        )
        assert (
            client.get(
                STATUS,
                params={"projectId": str(space_a), "conversationId": str(uuid.uuid4())},
            ).status_code
            == 404
        )
