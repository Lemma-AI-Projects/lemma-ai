"""The Space Goal, against a real database — and the one boundary that matters.

Two claims are pinned here, in this order:

  1. **A confirmed goal becomes the space's direction** — it reaches the
     decision layer's snapshot as a `GoalFact`, and the brief's `goal` slot stops
     being null for the first time.
  2. **An unconfirmed one reaches nothing.** A `draft` goal is somebody's guess
     about what the learner wants; the whole point of the confirm step is that a
     guess may not steer a decision. This is the claim worth testing hardest,
     because it is the one that is tempting to skip in implementation.

Plus the lifecycle the plan promises: change / pause / close / start again, and
the promise that a change leaves a trace in Space Memory rather than in a history
table that does not exist.

The two pure helpers (`outcome_kind`, `is_user_close`) are tested here too and
deliberately do NOT request the `space` fixture — so they still run on a machine
with no database.

Skips when Postgres is unreachable and needs `alembic upgrade head`.
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select, text

from ai.coordinator import EVENT_LEARNER_STATE_UPDATED, SOURCE_API, CoordinatorEvent
from core.database import AsyncSessionLocal, engine
from models.space_goal import SpaceGoal
from models.space_memory import SpaceMemory
from schemas.space_goal import SpaceGoalCreateIn, SpaceGoalUpdateIn
from services import coordinator_service, space_goal_service


def run(coro):
    """asyncio.run with the pool drained on both sides (see test_coordinator_db)."""

    async def wrapper():
        with contextlib.suppress(Exception):
            await engine.dispose()
        try:
            return await coro
        finally:
            with contextlib.suppress(Exception):
                await engine.dispose()

    return asyncio.run(wrapper())


# --- pure helpers: no database needed ---------------------------------------


def test_outcome_kind_says_who_is_allowed_to_judge_the_result():
    """Only `understanding` leaves evidence the system can read.

    An exam score and a shipped project are reported by the learner; `other` is
    treated the same way because an unknown purpose is exactly the case where the
    system has no business claiming it can tell.
    """
    assert space_goal_service.outcome_kind("understanding") == "system_observable"
    for purpose in ("exam_performance", "build_something", "other"):
        assert space_goal_service.outcome_kind(purpose) == "externally_reported"


def test_the_close_reason_prefix_is_what_separates_the_two_closers():
    """`system_*` is a judgement; `user_*` is a decision. The prefix carries it."""
    assert space_goal_service.is_user_close("user_achieved") is True
    assert space_goal_service.is_user_close("user_abandoned") is True
    assert space_goal_service.is_user_close("system_no_further_value") is False


# --- the database half -------------------------------------------------------


@pytest.fixture()
def space():
    """A throwaway user with one empty space, per test."""

    async def _probe():
        async with engine.connect() as conn:
            await conn.execute(text("select 1"))

    try:
        run(_probe())
    except Exception as exc:  # noqa: BLE001 — any failure means "no database here"
        pytest.skip(f"no database reachable: {type(exc).__name__}: {exc}")

    user_id, project_id = run(_create_space())
    yield user_id, project_id, uuid.uuid4()
    run(_drop_user(user_id))


async def _create_space() -> tuple[uuid.UUID, uuid.UUID]:
    user_id, project_id = uuid.uuid4(), uuid.uuid4()
    email = f"goal-test-{user_id}@example.test"
    async with engine.begin() as conn:
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
            {"id": project_id, "u": user_id, "n": "TOEFL 冲刺"},
        )
    return user_id, project_id


async def _drop_user(user_id: uuid.UUID) -> None:
    async with engine.begin() as conn:
        await conn.execute(text("delete from auth.users where id = :id"), {"id": user_id})


def _payload(**over) -> SpaceGoalCreateIn:
    base = dict(
        target_text="两个月后 TOEFL 117",
        deadline_at=datetime.now(UTC) + timedelta(days=61),
        context="TOEFL",
        purpose="exam_performance",
        origin="user_stated",
    )
    base.update(over)
    return SpaceGoalCreateIn(**base)


async def _create(space, **over) -> SpaceGoal:
    user_id, project_id, _stranger = space
    async with AsyncSessionLocal() as db:
        return await space_goal_service.create_draft(
            db, user_id=user_id, project_id=project_id, payload=_payload(**over)
        )


async def _confirm(space, goal_id: uuid.UUID) -> SpaceGoal:
    user_id, project_id, _stranger = space
    async with AsyncSessionLocal() as db:
        return await space_goal_service.confirm(
            db, user_id=user_id, project_id=project_id, goal_id=goal_id
        )


async def _snapshot_goal(space):
    """What the decision layer would see for this space, right now."""
    user_id, project_id, _stranger = space
    async with AsyncSessionLocal() as db:
        snapshot = await coordinator_service.build_snapshot(
            db,
            user_id=user_id,
            event=CoordinatorEvent(
                type=EVENT_LEARNER_STATE_UPDATED,
                source=SOURCE_API,
                payload={"projectId": str(project_id)},
            ),
            project_id=project_id,
        )
    return snapshot.goal


async def _memories(space) -> list[str]:
    _user_id, project_id, _stranger = space
    async with AsyncSessionLocal() as db:
        rows = (
            (
                await db.execute(
                    select(SpaceMemory.text)
                    .where(SpaceMemory.project_id == project_id)
                    .order_by(SpaceMemory.created_at)
                )
            )
            .scalars()
            .all()
        )
    return list(rows)


async def _goal_rows(space) -> list[SpaceGoal]:
    _user_id, project_id, _stranger = space
    async with AsyncSessionLocal() as db:
        rows = (
            (
                await db.execute(
                    select(SpaceGoal)
                    .where(SpaceGoal.project_id == project_id)
                    .order_by(SpaceGoal.created_at)
                )
            )
            .scalars()
            .all()
        )
    return list(rows)


# --- 1 · a confirmed goal becomes the direction -----------------------------


def test_a_confirmed_goal_reaches_the_snapshot_and_the_brief(space):
    """The vertical slice: create -> confirm -> the decision layer can read it."""
    goal = run(_create(space))
    assert goal.status == "draft"
    assert run(_snapshot_goal(space)) is None, "draft 不该进快照"

    confirmed = run(_confirm(space, goal.id))
    assert confirmed.status == "active"
    assert confirmed.confirmed_at is not None
    assert space_goal_service.outcome_kind(confirmed.purpose) == "externally_reported"

    fact = run(_snapshot_goal(space))
    assert fact is not None
    assert fact.target_text == "两个月后 TOEFL 117"
    assert fact.purpose == "exam_performance"
    assert fact.context == "TOEFL"
    assert fact.deadline_at is not None


def test_a_goal_with_no_deadline_is_still_a_goal(space):
    """「想真正学懂线性代数」 —— 没有 deadline，依然是完整的目标。"""
    goal = run(_create(space, target_text="想真正学懂线性代数", deadline_at=None,
                       context=None, purpose="understanding"))
    run(_confirm(space, goal.id))
    fact = run(_snapshot_goal(space))
    assert fact is not None and fact.deadline_at is None
    assert fact.purpose == "understanding"


def test_a_goal_never_reaches_the_snapshot_while_it_is_unconfirmed(space):
    """The claim the confirm step exists for: a guess may not steer anything."""
    run(_create(space, origin="agent_proposed"))
    assert run(_snapshot_goal(space)) is None
    # 未确认不等于失败：它还在，只是没有方向权。
    rows = run(_goal_rows(space))
    assert len(rows) == 1 and rows[0].status == "draft"


# --- 2 · the lifecycle -------------------------------------------------------


def test_only_one_active_goal_per_space(space):
    first = run(_create(space))
    run(_confirm(space, first.id))
    second = run(_create(space))

    with pytest.raises(space_goal_service.GoalRefused) as caught:
        run(_confirm(space, second.id))
    assert caught.value.reason == "space_already_has_active_goal"
    assert caught.value.status == 422
    # 第一个仍然是方向，第二个仍然是草稿 —— 拒绝没有改变任何东西。
    rows = run(_goal_rows(space))
    assert [row.status for row in rows] == ["active", "draft"]


def test_changing_the_target_edits_the_row_and_leaves_one_memory(space):
    goal = run(_create(space))
    run(_confirm(space, goal.id))

    async def _update():
        user_id, project_id, _stranger = space
        async with AsyncSessionLocal() as db:
            return await space_goal_service.update(
                db,
                user_id=user_id,
                project_id=project_id,
                goal_id=goal.id,
                payload=SpaceGoalUpdateIn(target_text="这次先把口语提高到 28"),
            )

    updated = run(_update())
    assert updated.target_text == "这次先把口语提高到 28"
    # 就地改，不产生新行 —— 目标的多版本历史是 V1 的事。
    assert len(run(_goal_rows(space))) == 1
    memories = run(_memories(space))
    assert len(memories) == 1 and "口语提高到 28" in memories[0]


def test_pausing_is_not_a_change_of_direction(space):
    """暂停可以恢复，所以它不该在空间记忆里留下一条"目标变了"。"""
    goal = run(_create(space))
    run(_confirm(space, goal.id))

    async def _pause():
        user_id, project_id, _stranger = space
        async with AsyncSessionLocal() as db:
            return await space_goal_service.pause(
                db, user_id=user_id, project_id=project_id, goal_id=goal.id
            )

    async def _resume():
        user_id, project_id, _stranger = space
        async with AsyncSessionLocal() as db:
            return await space_goal_service.resume(
                db, user_id=user_id, project_id=project_id, goal_id=goal.id
            )

    assert run(_pause()).status == "paused"
    assert run(_snapshot_goal(space)) is None, "暂停的目标不再驱动决定"
    assert run(_resume()).status == "active"
    assert run(_snapshot_goal(space)) is not None
    assert run(_memories(space)) == []


def test_closing_records_who_closed_it_and_frees_the_space(space):
    """场景 8：用户宣布达成 ⇒ 关掉 ⇒ 空间还活着 ⇒ 立刻开下一个。"""

    async def _close(goal_id, reason):
        user_id, project_id, _stranger = space
        async with AsyncSessionLocal() as db:
            return await space_goal_service.close(
                db,
                user_id=user_id,
                project_id=project_id,
                goal_id=goal_id,
                reason=reason,
            )

    goal = run(_create(space))
    run(_confirm(space, goal.id))
    closed = run(_close(goal.id, "user_achieved"))
    assert closed.status == "closed"
    assert closed.closed_reason == "user_achieved"
    assert run(_snapshot_goal(space)) is None

    # 关闭留下一条痕迹，而且它说清了是谁决定的。
    memories = run(_memories(space))
    assert len(memories) == 1 and "你决定" in memories[0]

    # 空间仍然活着：可以立刻开始下一个目标周期。
    second = run(_create(space, target_text="继续在这个空间提高阅读"))
    assert run(_confirm(space, second.id)).status == "active"


def test_a_closed_goal_cannot_be_edited(space):
    """"改回去"是一个新目标，不是编辑一个旧目标。"""
    goal = run(_create(space))
    run(_confirm(space, goal.id))

    async def _close():
        user_id, project_id, _stranger = space
        async with AsyncSessionLocal() as db:
            return await space_goal_service.close(
                db, user_id=user_id, project_id=project_id, goal_id=goal.id,
                reason="user_abandoned",
            )

    async def _update():
        user_id, project_id, _stranger = space
        async with AsyncSessionLocal() as db:
            return await space_goal_service.update(
                db, user_id=user_id, project_id=project_id, goal_id=goal.id,
                payload=SpaceGoalUpdateIn(target_text="随便改改"),
            )

    run(_close())
    with pytest.raises(space_goal_service.GoalRefused) as caught:
        run(_update())
    assert caught.value.reason == "goal_closed"


def test_the_database_refuses_a_closed_goal_without_a_reason(space):
    """「关闭」必须带理由 —— 这条落在 SQL 上，不靠约定。"""
    goal = run(_create(space))

    async def _close_without_reason():
        async with engine.begin() as conn:
            await conn.execute(
                text("update space_goals set status = 'closed' where id = :id"),
                {"id": goal.id},
            )

    with pytest.raises(Exception) as caught:
        run(_close_without_reason())
    assert "ck_space_goals_close_reason_present" in str(caught.value)


# --- 3 · the boundary --------------------------------------------------------


def test_another_persons_space_is_refused(space):
    """IDOR：不是你的空间，和"没有这个空间"给同一个答案。"""
    _user_id, project_id, stranger = space

    async def _try_create():
        async with AsyncSessionLocal() as db:
            return await space_goal_service.create_draft(
                db, user_id=stranger, project_id=project_id, payload=_payload()
            )

    async def _try_list():
        async with AsyncSessionLocal() as db:
            return await space_goal_service.list_for_space(
                db, user_id=stranger, project_id=project_id
            )

    with pytest.raises(space_goal_service.GoalRefused) as caught:
        run(_try_create())
    assert caught.value.status == 404
    assert run(_try_list()) is None
    assert run(_goal_rows(space)) == []


def test_creating_a_goal_writes_nothing_but_the_goal(space):
    """建立目标不碰空间记忆 —— 只有"方向变了"才值得记一条。"""
    run(_create(space))
    assert run(_memories(space)) == []
    assert len(run(_goal_rows(space))) == 1
