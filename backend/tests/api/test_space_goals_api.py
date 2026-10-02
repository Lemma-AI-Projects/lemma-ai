"""空间目标的接口：建立 / 回述确认 / 修改 / 暂停 / 恢复 / 关闭。

四条断言，每一条都是产品承诺：

  * **没确认的目标不驱动任何东西** —— 建立之后它只是 `draft`，`active` 仍然是
    `null`。目标会驱动排序与终止，一个没点头的目标就是一次猜测。
  * **拒绝要说得出理由** —— 别人的空间 404、第二次确认 422、关闭不带理由 422、
    改一个已经关掉的目标 422。绝不静默降级。
  * **改目标不产生新行**，暂停不留记忆（暂停不是方向变了）。
  * **抽取是读，不是写** —— 它回答"我听到了什么"，库里一行都不该多出来。

只断言**客户端看得见的东西**（`GET` 回来是什么），不在这里直接查库：库那一层由
`tests/services/test_space_goal_db.py` 钉住，而且 `asyncio.run()` 不能跑在
TestClient 块里 —— 事件循环的规矩和其他 API 测试一样。

Auth is the only thing faked (a `CurrentUser` in place of a token); the model call
is faked in the three extraction cases, and nowhere else.
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
from services import goal_extract_service

PROJECTS = "/api/v1/projects"


def run(coro):
    """asyncio.run with the pool drained on both sides. Fixture-only — never
    inside a `with act_as(...)` block (see the module docstring)."""

    async def wrapper():
        with contextlib.suppress(Exception):
            await engine.dispose()
        try:
            return await coro
        finally:
            with contextlib.suppress(Exception):
                await engine.dispose()

    return asyncio.run(wrapper())


async def _create() -> tuple[uuid.UUID, uuid.UUID, uuid.UUID]:
    user_a, user_b, space_a = (uuid.uuid4() for _ in range(3))
    async with engine.begin() as conn:
        for user_id, tag in ((user_a, "a"), (user_b, "b")):
            email = f"goal-{tag}-{user_id}@example.test"
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
    return user_a, user_b, space_a


async def _drop(*user_ids: uuid.UUID) -> None:
    async with engine.begin() as conn:
        for user_id in user_ids:
            await conn.execute(
                text("delete from auth.users where id = :id"), {"id": user_id}
            )


@pytest.fixture
def world():
    """(user_a, user_b, space_a) — space_a belongs to a; b owns nothing."""

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
    """`act_as(user_id)` -> a client whose caller is that user."""

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


GOAL = {
    "targetText": "两个月后 TOEFL 考到 117 分",
    "deadlineAt": (datetime.now(UTC) + timedelta(days=61)).isoformat(),
    "context": "TOEFL",
    "purpose": "exam_performance",
}


def _goals(space_id: uuid.UUID) -> str:
    return f"{PROJECTS}/{space_id}/goals"


def _create_goal(client: TestClient, space_id: uuid.UUID, **overrides):
    return client.post(_goals(space_id), json={**GOAL, **overrides})


def _confirm(client: TestClient, space_id: uuid.UUID, goal_id: str):
    return client.post(f"{_goals(space_id)}/{goal_id}/confirm")


# --- 建立：永远是 draft，而且不驱动任何东西 ---------------------------------


def test_a_new_goal_is_a_draft_and_steers_nothing(world, act_as):
    user_a, _user_b, space_a = world
    with act_as(user_a) as client:
        created = _create_goal(client, space_a)
        assert created.status_code == 201, created.text
        body = created.json()

        assert body["status"] == "draft"
        assert body["confirmedAt"] is None
        assert body["outcomeKind"] == "externally_reported"
        assert body["origin"] == "user_entered"

        # 关键：它还不能驱动任何东西 —— 没有 active 目标。
        active = client.get(f"{_goals(space_a)}/active")
        assert active.status_code == 200, active.text
        assert active.json() is None


def test_confirming_makes_it_the_direction(world, act_as):
    user_a, _user_b, space_a = world
    with act_as(user_a) as client:
        goal_id = _create_goal(client, space_a).json()["id"]
        confirmed = _confirm(client, space_a, goal_id)
        assert confirmed.status_code == 200, confirmed.text
        assert confirmed.json()["status"] == "active"
        assert confirmed.json()["confirmedAt"] is not None

        active = client.get(f"{_goals(space_a)}/active").json()
        assert active["id"] == goal_id
        assert active["targetText"] == GOAL["targetText"]
        assert active["purpose"] == "exam_performance"
        assert active["context"] == "TOEFL"


def test_an_understanding_goal_is_marked_system_observable(world, act_as):
    """"能不能解释"系统判得了；"考了多少分"判不了。这条区分由 purpose 算出来。"""
    user_a, _user_b, space_a = world
    with act_as(user_a) as client:
        body = _create_goal(
            client,
            space_a,
            targetText="真正学懂线性代数，不是为了考试",
            deadlineAt=None,
            context="线性代数",
            purpose="understanding",
        ).json()
        assert body["outcomeKind"] == "system_observable"
        assert body["deadlineAt"] is None


# --- 拒绝要说得出理由 --------------------------------------------------------


def test_another_persons_space_is_a_404(world, act_as):
    _user_a, user_b, space_a = world
    with act_as(user_b) as client:
        assert client.get(_goals(space_a)).status_code == 404
        assert client.get(f"{_goals(space_a)}/active").status_code == 404
        assert _create_goal(client, space_a).status_code == 404


def test_somebody_elses_goal_id_is_a_404(world, act_as):
    """另一个空间的目标 id，在自己空间的路由下必须是 404，不能是 500 或 422。"""
    user_a, user_b, space_a = world
    not_a_space = uuid.uuid4()
    with act_as(user_a) as client:
        goal_id = _create_goal(client, space_a).json()["id"]
        # 同一个空间里编一个不存在的 id
        assert client.post(f"{_goals(space_a)}/{uuid.uuid4()}/confirm").status_code == 404
        # 真实存在的 id，但挂在别人的空间下面
        assert client.post(f"{_goals(not_a_space)}/{goal_id}/confirm").status_code == 404
    with act_as(user_b) as client:
        assert client.post(f"{_goals(not_a_space)}/{goal_id}/confirm").status_code == 404


def test_a_second_active_goal_is_refused(world, act_as):
    """两条活着的方向会让之后每一个决定都解释不清 —— 拒绝，别悄悄替换。"""
    user_a, _user_b, space_a = world
    with act_as(user_a) as client:
        first = _create_goal(client, space_a).json()["id"]
        _confirm(client, space_a, first)
        second = _create_goal(client, space_a, targetText="先把口语提到 28").json()["id"]

        refused = _confirm(client, space_a, second)
        assert refused.status_code == 422, refused.text
        assert refused.json()["detail"] == "space_already_has_active_goal"
        # 被拒之后，活着的仍然是第一个。
        assert client.get(f"{_goals(space_a)}/active").json()["id"] == first


def test_closing_without_a_reason_is_refused_by_the_contract(world, act_as):
    """"没有理由的停止"是整套设计要避免的那个状态，所以理由在契约层就是必填。"""
    user_a, _user_b, space_a = world
    with act_as(user_a) as client:
        goal_id = _create_goal(client, space_a).json()["id"]
        assert client.post(f"{_goals(space_a)}/{goal_id}/close", json={}).status_code == 422


def test_a_closed_goal_can_be_neither_edited_nor_closed_again(world, act_as):
    user_a, _user_b, space_a = world
    with act_as(user_a) as client:
        goal_id = _create_goal(client, space_a).json()["id"]
        closed = client.post(
            f"{_goals(space_a)}/{goal_id}/close", json={"reason": "user_abandoned"}
        )
        assert closed.status_code == 200, closed.text
        assert closed.json()["status"] == "closed"
        assert closed.json()["closedReason"] == "user_abandoned"

        again = client.post(
            f"{_goals(space_a)}/{goal_id}/close", json={"reason": "user_achieved"}
        )
        assert again.status_code == 422
        assert again.json()["detail"] == "goal_already_closed"

        edited = client.patch(
            f"{_goals(space_a)}/{goal_id}", json={"targetText": "换成 110"}
        )
        assert edited.status_code == 422
        assert edited.json()["detail"] == "goal_closed"


# --- 改：同一行；暂停不留痕迹 ------------------------------------------------


def test_editing_changes_the_same_goal_and_opens_no_new_one(world, act_as):
    user_a, _user_b, space_a = world
    with act_as(user_a) as client:
        goal_id = _create_goal(client, space_a).json()["id"]
        _confirm(client, space_a, goal_id)

        edited = client.patch(
            f"{_goals(space_a)}/{goal_id}", json={"targetText": "改成 110 分"}
        )
        assert edited.status_code == 200, edited.text
        assert edited.json()["targetText"] == "改成 110 分"
        assert edited.json()["status"] == "active"
        # 同一个目标，不是新开一个。
        listed = client.get(_goals(space_a)).json()
        assert len(listed) == 1
        assert listed[0]["id"] == goal_id
        assert listed[0]["targetText"] == "改成 110 分"


def test_pausing_takes_the_direction_away_and_resuming_brings_it_back(world, act_as):
    user_a, _user_b, space_a = world
    with act_as(user_a) as client:
        goal_id = _create_goal(client, space_a).json()["id"]
        _confirm(client, space_a, goal_id)

        paused = client.post(f"{_goals(space_a)}/{goal_id}/pause")
        assert paused.status_code == 200, paused.text
        assert paused.json()["status"] == "paused"
        # 暂停之后就没有方向了 —— 决定层读到 null。
        assert client.get(f"{_goals(space_a)}/active").json() is None

        resumed = client.post(f"{_goals(space_a)}/{goal_id}/resume")
        assert resumed.status_code == 200, resumed.text
        assert resumed.json()["status"] == "active"
        assert client.get(f"{_goals(space_a)}/active").json()["id"] == goal_id


def test_after_closing_you_can_start_the_next_one(world, act_as):
    """场景 8：这个目标完成了，想在这个空间继续提高 —— 关掉、再开一个。"""
    user_a, _user_b, space_a = world
    with act_as(user_a) as client:
        first = _create_goal(client, space_a).json()["id"]
        _confirm(client, space_a, first)
        client.post(f"{_goals(space_a)}/{first}/close", json={"reason": "user_achieved"})

        second = _create_goal(client, space_a, targetText="把口语提到 28 分").json()["id"]
        assert _confirm(client, space_a, second).status_code == 200
        assert client.get(f"{_goals(space_a)}/active").json()["id"] == second

        listed = client.get(_goals(space_a)).json()
        assert [row["status"] for row in listed] == ["active", "closed"]


# --- 抽取：这是读，不是写 ----------------------------------------------------


def _fake_generate(draft):
    async def _call(_use_case, _prompt, _output_type, **_kwargs):
        return draft

    return _call


def test_extraction_returns_a_suggestion_and_writes_nothing(world, act_as, monkeypatch):
    """场景 1：他说了那句话 ⇒ 听到一个目标 ⇒ 但库里一行都不多。"""
    from ai.goal_extract import GoalDraft

    user_a, _user_b, space_a = world
    deadline = datetime.now(UTC) + timedelta(days=61)
    monkeypatch.setattr(
        goal_extract_service.ai_client,
        "generate",
        _fake_generate(
            GoalDraft(
                target_text="TOEFL 考到 117 分",
                deadline_at=deadline,
                context="TOEFL",
                purpose="exam_performance",
                confidence="high",
            )
        ),
    )
    with act_as(user_a) as client:
        heard = client.post(
            f"{_goals(space_a)}/extract",
            json={"message": "我两个月后考试，想考 117"},
        )
        assert heard.status_code == 200, heard.text
        body = heard.json()
        assert body["heard"] is True
        assert body["targetText"] == "TOEFL 考到 117 分"
        assert body["purpose"] == "exam_performance"
        assert body["deadlineAt"].startswith(deadline.date().isoformat())
        # **读不写**：一个目标都没多出来。
        assert client.get(_goals(space_a)).json() == []
        assert client.get(f"{_goals(space_a)}/active").json() is None


def test_extraction_hears_nothing_and_says_so(world, act_as, monkeypatch):
    """大多数话里没有目标 —— 那是一个正常回答，不是失败。"""
    from ai.goal_extract import GoalDraft

    user_a, _user_b, space_a = world
    monkeypatch.setattr(
        goal_extract_service.ai_client,
        "generate",
        _fake_generate(GoalDraft(confidence="none")),
    )
    with act_as(user_a) as client:
        answer = client.post(
            f"{_goals(space_a)}/extract", json={"message": "这个公式为什么成立？"}
        )
        assert answer.status_code == 200, answer.text
        body = answer.json()
        assert body["heard"] is False
        # 什么都没听到的时候，一个字都不该编出来。
        assert body["targetText"] is None
        assert body["purpose"] is None
        assert body["deadlineAt"] is None


def test_a_failed_reading_is_not_an_empty_reading(world, act_as, monkeypatch):
    """模型读不出来 ⇒ 502。绝不能让它长得像"你这句话里没有目标"。"""

    async def _boom(*_args, **_kwargs):
        raise RuntimeError("no route")

    user_a, _user_b, space_a = world
    monkeypatch.setattr(goal_extract_service.ai_client, "generate", _boom)
    with act_as(user_a) as client:
        failed = client.post(
            f"{_goals(space_a)}/extract", json={"message": "我两个月后考试"}
        )
        assert failed.status_code == 502, failed.text
        assert failed.json()["detail"] == "goal_extract_unavailable"
