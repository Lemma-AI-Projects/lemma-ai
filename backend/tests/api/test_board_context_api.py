"""Mala 的投送包：存住一次选择，并把它写进下一轮对话的提示词。

三条断言，每一条都是产品承诺：

  * **能存能读**：投送回来的东西，读回时一模一样（快照，不是活引用）；
  * **拒绝要明确**：空选区 / 超限 / 别人的空间 / 别人的包，全部有理由，绝不静默降级；
  * **真的进了提示词**：渲染出来的那一段里有材料、有掌握度、有连接，还有那条
    「只基于这些材料回答」的纪律 —— 而不是只落进了一张表。

最后一条用**纯函数**断言（不经数据库）：它要防的是"渲染写错"，那是纯逻辑；
接口那条链由前两条覆盖，而"材料真的进了 prompt"由渲染 + 注入点共同保证。

Auth is the only thing faked (a `CurrentUser` in place of a token).
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from core.database import AsyncSessionLocal, engine, get_db
from core.security import CurrentUser, get_current_user
from main import app
from services.board_context_service import render_selection_block

BOARD = "/api/v1/board"
CHAT = "/api/v1/chat"


def run(coro):
    """asyncio.run with the pool drained on both sides (see test_notifications_db)."""

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
            email = f"mala-{tag}-{user_id}@example.test"
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
            {"id": space_a, "u": user_a, "n": "mala-space-A"},
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


def _items(count: int, *, text: str = "特征值") -> list[dict]:
    return [
        {
            "shapeId": f"s{index}",
            "type": "knowledgeCard",
            "text": f"{text} {index}",
            "mastery": "due",
            "connectedIds": [f"s{index + 1}"] if index + 1 < count else [],
        }
        for index in range(count)
    ]


def _create_bundle(client: TestClient, space_id: uuid.UUID, **overrides) -> dict:
    payload = {
        "projectId": str(space_id),
        "label": "矩阵基础相关",
        "source": "cluster",
        "selectionMode": "lasso",
        "boundingBox": {"x": 0, "y": 0, "width": 320, "height": 200},
        "items": _items(3),
        **overrides,
    }
    return client.post(f"{BOARD}/contexts", json=payload)


# --- 能存能读 ----------------------------------------------------------------


def test_a_selection_round_trips_unchanged(world, act_as):
    user_a, _user_b, space_a = world
    with act_as(user_a) as client:
        created = _create_bundle(client, space_a)
        assert created.status_code == 201, created.text
        body = created.json()

        assert body["itemCount"] == 3
        assert body["label"] == "矩阵基础相关"
        assert body["source"] == "cluster"
        assert body["selectionMode"] == "lasso"
        assert [item["shapeId"] for item in body["items"]] == ["s0", "s1", "s2"]

        read_back = client.get(f"{BOARD}/contexts/{body['id']}")
        assert read_back.status_code == 200, read_back.text
        # 快照：读回的东西与投送时**一模一样**（画板后来变了也不影响这里）。
        assert read_back.json() == body


# --- 拒绝要明确 --------------------------------------------------------------


def test_an_empty_selection_is_refused(world, act_as):
    user_a, _user_b, space_a = world
    with act_as(user_a) as client:
        response = _create_bundle(client, space_a, items=[])
        assert response.status_code == 422
        assert response.json()["detail"] == "empty_selection"


def test_an_oversized_selection_is_refused_not_truncated(world, act_as):
    user_a, _user_b, space_a = world
    with act_as(user_a) as client:
        response = _create_bundle(client, space_a, items=_items(25))
        assert response.status_code == 422
        # 截断会让用户以为全带上了 —— 所以这里是报错。
        assert response.json()["detail"] == "too_many_items"


def test_a_selection_with_no_readable_text_is_refused(world, act_as):
    user_a, _user_b, space_a = world
    with act_as(user_a) as client:
        response = _create_bundle(
            client,
            space_a,
            items=[{"shapeId": "s0", "type": "knowledgeCard", "text": "   "}],
        )
        assert response.status_code == 422
        assert response.json()["detail"] == "no_readable_text"


def test_another_persons_space_cannot_be_written_to(world, act_as):
    _user_a, user_b, space_a = world
    with act_as(user_b) as client:
        response = _create_bundle(client, space_a)
        assert response.status_code == 404
        assert response.json()["detail"] == "project_not_found"


def test_another_persons_bundle_cannot_be_read(world, act_as):
    user_a, user_b, space_a = world
    with act_as(user_a) as client:
        created = _create_bundle(client, space_a).json()

    with act_as(user_b) as client:
        response = client.get(f"{BOARD}/contexts/{created['id']}")
        assert response.status_code == 404
        # 存在但不属于他，与压根不存在，对外是同一个答案。
        assert response.json()["detail"] == "context_not_found"


def test_chat_refuses_a_bundle_it_cannot_find(world, act_as):
    """材料读不到时，必须在**开流之前**报错。

    这是这条链最不能有的一种失败：静默忽略 + 200，用户会照着不存在的前提问下去。
    """
    user_a, user_b, space_a = world
    with act_as(user_a) as client:
        foreign = _create_bundle(client, space_a).json()

    with act_as(user_b) as client:
        response = client.post(
            CHAT,
            json={
                "projectId": str(space_a),
                "contextBundleIds": [foreign["id"]],
                "messages": [{"role": "user", "content": "这几个是什么关系？"}],
            },
        )
        assert response.status_code in (403, 404, 422), response.text
        assert response.headers.get("content-type", "").startswith("application/json")


# --- 真的进了提示词（纯函数）-------------------------------------------------


def test_the_rendered_block_carries_material_mastery_links_and_the_discipline():
    bundle = SimpleNamespace(
        label="矩阵基础相关",
        items=[
            {
                "shapeId": "s0",
                "type": "knowledgeCard",
                "text": "特征值的几何意义",
                "mastery": "due",
                "connectedIds": ["s1"],
            },
            {
                "shapeId": "s1",
                "type": "conceptNode",
                "text": "特征向量",
                "mastery": "learning",
                "connectedIds": [],
            },
        ],
    )
    block = render_selection_block([bundle])

    assert "用户投送的材料" in block
    assert "矩阵基础相关" in block and "2 项" in block
    assert "特征值的几何意义" in block and "特征向量" in block
    assert "该复习" in block and "正在学" in block
    # 连接只写这批材料内部的（s0 ↔ s1）。
    assert "特征值的几何意义 ↔ 特征向量" in block
    # 纪律句：没有它，模型最可能的失败是猜错意图然后自信地答。
    assert "只基于它们回答" in block


def test_nothing_is_rendered_when_nothing_was_sent():
    # 空 = 这一轮没投送 ⇒ 提示词里就不出现这一段（不占位、不写"没有材料"）。
    assert render_selection_block([]) == ""


def test_a_shape_without_text_is_skipped_without_killing_the_links():
    bundle = SimpleNamespace(
        label=None,
        items=[
            {"shapeId": "a", "type": "note", "text": "  ", "connectedIds": ["b"]},
            {"shapeId": "b", "type": "note", "text": "有内容", "connectedIds": ["a"]},
        ],
    )
    block = render_selection_block([bundle])
    assert "有内容" in block
    assert "未命名的一组" in block
