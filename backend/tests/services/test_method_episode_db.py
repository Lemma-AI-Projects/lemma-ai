"""Method episodes through the SERVICE layer — the one door, against a real database.

Why this is a DB test and not a pure one: the constraint that matters most here
is **"at most one live episode per space"**, and that is enforced by a partial
unique index rather than by a service check. A pure test could only assert that
the service *asks*; only the database can show that a second insert is actually
rejected when the check is bypassed.

Each service call is one `call(...)` with its own session and a drained pool on
both sides — the pattern the other DB-backed modules use, because a shared
Engine across event loops raises.

Skipped when no database is reachable, so a checkout without the local Postgres
still runs the suite green.
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from core.database import AsyncSessionLocal, engine
from models.method_episode import EPISODE_STATUSES
from services import method_episode_service
from services.method_episode_service import EpisodeRefused

RULE = {"kind": "consecutive_correct", "n": 2}
TARGET = {"item_hint": "换元后的上下限", "tier": "B"}
COMMITMENT = "你自己做对两道，就算过"


def call(fn, *args, **kwargs):
    """Run one coroutine with a fresh session and a drained pool."""

    async def wrapper():
        with contextlib.suppress(Exception):
            await engine.dispose()
        try:
            async with AsyncSessionLocal() as db:
                return await fn(db, *args, **kwargs)
        finally:
            with contextlib.suppress(Exception):
                await engine.dispose()

    return asyncio.run(wrapper())


@pytest.fixture
def space():
    """A fresh space **per test**.

    Function scope, not module scope, and the reason is the partial unique
    index: a leftover `active` episode from an earlier test would make every
    later one fail with `space_already_has_active_episode` — which reads like a
    bug in the service when it is a bug in the fixture. Each test gets its own
    space so the constraint under test is the only thing it can trip over.
    """

    async def _probe():
        with contextlib.suppress(Exception):
            await engine.dispose()
        try:
            async with engine.connect() as conn:
                await conn.execute(text("select 1"))
        finally:
            with contextlib.suppress(Exception):
                await engine.dispose()

    try:
        asyncio.run(_probe())
    except Exception as exc:  # noqa: BLE001 — any failure means "no database here"
        pytest.skip(f"no database reachable: {type(exc).__name__}: {exc}")

    ids = asyncio.run(_create_space())
    try:
        yield ids
    finally:
        asyncio.run(_drop_space(ids[0]))


async def _create_space() -> tuple[uuid.UUID, uuid.UUID]:
    user_id, project_id = uuid.uuid4(), uuid.uuid4()
    email = f"episode-test-{user_id}@example.test"
    with contextlib.suppress(Exception):
        await engine.dispose()
    try:
        async with engine.begin() as conn:
            await conn.execute(
                text("insert into auth.users (id, email) values (:id, :email)"),
                {"id": user_id, "email": email},
            )
            await conn.execute(
                text(
                    "insert into profiles (id, email, avatar_color) "
                    "values (:id, :e, :c)"
                ),
                {"id": user_id, "e": email, "c": "#000000"},
            )
            await conn.execute(
                text("insert into projects (id, user_id, name) values (:id, :u, :n)"),
                {"id": project_id, "u": user_id, "n": "episode-test-space"},
            )
    finally:
        with contextlib.suppress(Exception):
            await engine.dispose()
    return user_id, project_id


async def _drop_space(user_id: uuid.UUID) -> None:
    with contextlib.suppress(Exception):
        await engine.dispose()
    try:
        async with engine.begin() as conn:
            await conn.execute(
                text("delete from auth.users where id = :id"), {"id": user_id}
            )
    finally:
        with contextlib.suppress(Exception):
            await engine.dispose()


def _open(user_id, project_id, method="socratic", **kwargs):
    return call(
        method_episode_service.open_episode,
        user_id=user_id,
        project_id=project_id,
        method=method,
        commitment=kwargs.pop("commitment", COMMITMENT),
        completion_rule=kwargs.pop("completion_rule", dict(RULE)),
        evidence_target=kwargs.pop("evidence_target", dict(TARGET)),
        **kwargs,
    )


def _close(user_id, episode_id, status, reason=None):
    return call(
        method_episode_service.close_episode,
        user_id=user_id,
        episode_id=episode_id,
        status=status,
        reason=reason,
    )


# --- 开一段 ------------------------------------------------------------------


def test_an_episode_opens_with_the_declaration_snapshotted(space):
    user_id, project_id = space
    episode = _open(user_id, project_id, goal_purpose="exam_performance")
    assert episode.status == "active"
    assert episode.method == "socratic"
    assert episode.goal_purpose == "exam_performance"
    assert episode.exit_reason is None
    assert episode.closed_at is None
    # 判据与人话存在同一行：分开必然漂，而漂了之后"我们说两道、只数一道"
    # 是查不出来的。
    assert episode.completion_rule == RULE
    assert "两道" in episode.commitment
    assert episode.evidence_target["tier"] == "B"
    # 快照的意义：明天改了 purpose，也不能改掉今天承诺过什么。
    assert episode.goal_purpose == "exam_performance"


def test_the_active_episode_is_what_a_decision_reads(space):
    user_id, project_id = space
    assert call(method_episode_service.get_active, project_id=project_id) is None
    opened = _open(user_id, project_id)
    found = call(method_episode_service.get_active, project_id=project_id)
    assert found is not None
    assert found.id == opened.id


# --- 至多一段在进行 ----------------------------------------------------------


def test_a_second_live_episode_is_refused(space):
    """服务层的拒绝是客气，**保证**在下面那条测试里。"""
    user_id, project_id = space
    _open(user_id, project_id)
    with pytest.raises(EpisodeRefused) as excinfo:
        _open(user_id, project_id, method="direct_explanation")
    assert excinfo.value.reason == "space_already_has_active_episode"


def test_the_database_itself_refuses_two_live_episodes(space):
    """⚠️ 直接插两行，绕过整个服务 —— 第二行必须被数据库挡住。

    这条断言让约束成为**事实**而不是约定：服务里的检查可以被某次重构删掉，
    这条不能。
    """
    user_id, project_id = space
    _open(user_id, project_id)

    async def _bypass():
        with contextlib.suppress(Exception):
            await engine.dispose()
        try:
            async with engine.begin() as conn:
                await conn.execute(
                    text(
                        "insert into method_episodes "
                        "(id, project_id, user_id, method, commitment, "
                        " evidence_target, completion_rule, status) "
                        "values (:id, :p, :u, 'socratic', '再开一段', "
                        " '{}', '{}', 'active')"
                    ),
                    {"id": uuid.uuid4(), "p": project_id, "u": user_id},
                )
        finally:
            with contextlib.suppress(Exception):
                await engine.dispose()

    with pytest.raises(IntegrityError):
        asyncio.run(_bypass())


# --- 五个出口 ----------------------------------------------------------------


def test_closing_twice_is_refused(space):
    """两次关闭通常意味着两条代码路径都以为是自己结束了同一个承诺。

    第二次会抹掉第一次的理由，而那正是这一行存在的理由。
    """
    user_id, project_id = space
    episode = _open(user_id, project_id)
    _close(user_id, episode.id, "paused")
    with pytest.raises(EpisodeRefused) as excinfo:
        _close(user_id, episode.id, "achieved")
    assert excinfo.value.reason == "episode_already_closed"


@pytest.mark.parametrize("status", ["switched", "rediagnosed"])
def test_a_change_of_mind_must_say_why(space, status):
    """静默的换与随机的换，事后看起来一模一样。"""
    user_id, project_id = space
    episode = _open(user_id, project_id)
    with pytest.raises(EpisodeRefused) as excinfo:
        _close(user_id, episode.id, status)
    assert excinfo.value.reason == "episode_exit_reason_required"

    why = "他做出来了，换更难的" if status == "switched" else "缺的不是这个点"
    closed = _close(user_id, episode.id, status, why)
    assert closed.status == status
    assert closed.exit_reason == why
    assert closed.closed_at is not None


def test_paused_needs_no_reason(space):
    """学习者走开不是任何人做的决定，所以 `paused` 不要求理由。"""
    user_id, project_id = space
    episode = _open(user_id, project_id)
    closed = _close(user_id, episode.id, "paused")
    assert closed.status == "paused"
    assert closed.exit_reason is None


def test_an_invented_status_is_refused(space):
    """六个值是封闭集 —— 多一个就是一条没人设计过的生命周期。"""
    user_id, project_id = space
    episode = _open(user_id, project_id)
    with pytest.raises(EpisodeRefused) as excinfo:
        _close(user_id, episode.id, "reconsidering")
    assert excinfo.value.reason == "episode_status_invalid"
    # `active` 也不是出口：关进它是一次看起来成功的空操作。
    with pytest.raises(EpisodeRefused):
        _close(user_id, episode.id, "active")


def test_a_finished_episode_frees_the_space_for_the_next_one(space):
    """「先走完这段，再开始下一段」必须不花代价。"""
    user_id, project_id = space
    first = _open(user_id, project_id)
    _close(user_id, first.id, "achieved")
    assert call(method_episode_service.get_active, project_id=project_id) is None
    second = _open(user_id, project_id, method="direct_explanation")
    assert second.id != first.id

    history = call(method_episode_service.list_for_space, project_id=project_id)
    ids = [row.id for row in history]
    # 新est first — 这正是「继续上次」要用的顺序。
    assert ids[0] == second.id
    assert first.id in set(ids)
    assert {row.method for row in history} == {"socratic", "direct_explanation"}


# --- 边界 --------------------------------------------------------------------


def test_another_persons_episode_is_a_404(space):
    """IDOR 规则收在一个地方。"""
    user_id, project_id = space
    episode = _open(user_id, project_id)
    with pytest.raises(EpisodeRefused) as excinfo:
        call(
            method_episode_service.get_owned,
            user_id=uuid.uuid4(),
            episode_id=episode.id,
        )
    assert excinfo.value.status == 404


def test_another_persons_space_cannot_open_an_episode(space):
    user_id, project_id = space
    with pytest.raises(EpisodeRefused) as excinfo:
        _open(uuid.uuid4(), project_id)
    assert excinfo.value.status == 404


def test_an_episode_without_a_method_or_a_commitment_is_refused(space):
    """承诺需要两样东西：谁做的，和说清要做到什么。"""
    user_id, project_id = space
    with pytest.raises(EpisodeRefused) as excinfo:
        _open(user_id, project_id, method="   ")
    assert excinfo.value.reason == "method_is_required"
    with pytest.raises(EpisodeRefused) as excinfo:
        _open(user_id, project_id, commitment="  ")
    assert excinfo.value.reason == "commitment_is_required"


def test_the_method_name_survives_that_method_being_uninstalled(space):
    """⚠️ 无外键的回报：做法可以被卸载，那一段的事实仍然读得到。

    这正是删掉一个插件目录之后的状态。一段随插件一起消失，就抹掉了
    "我们曾经这样承诺过" 这条唯一的记录。
    """
    user_id, project_id = space
    orphan = _open(user_id, project_id, method="a_method_we_removed")
    found = call(
        method_episode_service.get_owned, user_id=user_id, episode_id=orphan.id
    )
    assert found.method == "a_method_we_removed"
    # 而且它照常能被关闭 —— 即使已经没有任何东西能跑它了。
    closed = _close(user_id, orphan.id, "achieved")
    assert closed.status == "achieved"


def test_the_status_set_is_the_documented_one(space):
    """六个值，一个不多。写死的常量、模型的 CHECK 与这里必须一致。"""
    assert EPISODE_STATUSES == (
        "active",
        "achieved",
        "not_achieved",
        "paused",
        "switched",
        "rediagnosed",
    )
