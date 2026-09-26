"""User Home over HTTP: the surface, its refusals, and its isolation.

What is asserted here is what a client can actually do, and — just as important
— what it cannot:

  * the Home page's whole payload comes back in one request;
  * a one-off or a proposal never becomes a confirmed line by itself;
  * confirming is an explicit request, and the row keeps its provenance;
  * a space preference is written through the SPACE route, not through Home;
  * every route is scoped to the token: another user's item answers 404.

Auth is the only thing faked (a `CurrentUser` in place of a token). The skip and
event-loop rules match the other API tests: `asyncio.run()` must not run inside a
TestClient block, so all database setup happens in the fixture.
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from core.database import AsyncSessionLocal, engine, get_db
from core.security import CurrentUser, get_current_user
from main import app

HOME = "/api/v1/users/me/home"


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


async def _create() -> tuple[uuid.UUID, uuid.UUID, uuid.UUID, uuid.UUID]:
    user_a, user_b, space_a, space_b = (uuid.uuid4() for _ in range(4))
    async with engine.begin() as conn:
        for user_id, tag in ((user_a, "a"), (user_b, "b")):
            email = f"user-home-api-{tag}-{user_id}@example.test"
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
        for project_id, owner, name in (
            (space_a, user_a, "home-api-A"),
            (space_b, user_a, "home-api-B"),
        ):
            await conn.execute(
                text("insert into projects (id, user_id, name) values (:id, :u, :n)"),
                {"id": project_id, "u": owner, "n": name},
            )
    return user_a, user_b, space_a, space_b


async def _drop(*user_ids: uuid.UUID) -> None:
    async with engine.begin() as conn:
        for user_id in user_ids:
            await conn.execute(
                text("delete from auth.users where id = :id"), {"id": user_id}
            )


@pytest.fixture
def world():
    """(user_a, user_b, space_a, space_b) — b owns nothing of a's."""

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


def test_home_starts_empty_and_about_round_trips(world, act_as):
    user_a, _user_b, _space_a, _space_b = world
    with act_as(user_a) as client:
        empty = client.get(HOME)
        assert empty.status_code == 200, empty.text
        body = empty.json()
        assert body["interests"] == []
        assert body["preferences"] == []
        assert body["candidates"] == []
        assert body["language"] is None
        # The nickname travels with Home even though `profiles` owns it.
        assert "nickname" in body

        patched = client.patch(
            HOME, json={"language": "zh", "background": "本科·计算机"}
        )
        assert patched.status_code == 200, patched.text
        assert patched.json()["language"] == "zh"
        assert patched.json()["background"] == "本科·计算机"

        # A partial update leaves the other field alone; an explicit null clears.
        only_language = client.patch(HOME, json={"language": "en"})
        assert only_language.json()["background"] == "本科·计算机"
        cleared = client.patch(HOME, json={"background": None})
        assert cleared.json()["background"] is None
        assert cleared.json()["language"] == "en"


def test_items_are_listed_by_kind_and_duplicates_are_refused(world, act_as):
    user_a, _user_b, _space_a, _space_b = world
    with act_as(user_a) as client:
        first = client.post(
            HOME + "/items", json={"kind": "interest", "text": "AI"}
        )
        assert first.status_code == 201, first.text
        assert first.json()["origin"] == "user"
        assert first.json()["status"] == "confirmed"
        assert first.json()["confirmedAt"] is not None

        client.post(HOME + "/items", json={"kind": "preference", "text": "回答尽量简洁"})

        listing = client.get(HOME).json()
        assert [row["text"] for row in listing["interests"]] == ["AI"]
        assert [row["text"] for row in listing["preferences"]] == ["回答尽量简洁"]

        # Same line twice: told so, not written twice.
        again = client.post(HOME + "/items", json={"kind": "interest", "text": "AI"})
        assert again.status_code == 409
        assert len(client.get(HOME).json()["interests"]) == 1

        # Blank is a validation error, not an empty row.
        blank = client.post(HOME + "/items", json={"kind": "interest", "text": "  "})
        assert blank.status_code == 422
        unknown = client.post(HOME + "/items", json={"kind": "skill", "text": "x"})
        assert unknown.status_code == 422


def test_a_proposal_needs_an_explicit_confirmation(world, act_as):
    user_a, _user_b, _space_a, _space_b = world
    with act_as(user_a) as client:
        proposed = client.post(
            HOME + "/candidates",
            json={"kind": "preference", "text": "以后都尽量简洁一点"},
        )
        assert proposed.status_code == 201, proposed.text
        candidate = proposed.json()
        assert candidate["status"] == "candidate"
        assert candidate["origin"] == "agent"
        # The whole point: pending means pending.
        assert candidate["confirmedAt"] is None

        listing = client.get(HOME).json()
        assert listing["preferences"] == []
        assert [row["text"] for row in listing["candidates"]] == ["以后都尽量简洁一点"]

        # The same proposal twice does not stack.
        duplicate = client.post(
            HOME + "/candidates",
            json={"kind": "preference", "text": "以后都尽量简洁一点"},
        )
        assert duplicate.status_code == 409

        confirmed = client.patch(
            f"{HOME}/items/{candidate['id']}", json={"status": "confirmed"}
        )
        assert confirmed.status_code == 200, confirmed.text
        assert confirmed.json()["confirmedAt"] is not None
        # Provenance survives: it stays visibly the agent's suggestion.
        assert confirmed.json()["origin"] == "agent"

        after = client.get(HOME).json()
        assert after["candidates"] == []
        assert [row["text"] for row in after["preferences"]] == ["以后都尽量简洁一点"]

        # Ignoring a proposal is the same call as removing a line.
        ignored = client.delete(f"{HOME}/items/{candidate['id']}")
        assert ignored.status_code == 204
        assert client.get(HOME).json()["preferences"] == []


def test_every_route_is_scoped_to_the_caller(world, act_as):
    user_a, user_b, _space_a, _space_b = world
    with act_as(user_a) as client:
        item = client.post(HOME + "/items", json={"kind": "interest", "text": "哲学"})
        item_id = item.json()["id"]

    with act_as(user_b) as client:
        # b's Home is their own (and empty), not a's.
        assert client.get(HOME).json()["interests"] == []
        # "not yours" and "does not exist" are the same answer, deliberately.
        assert client.patch(f"{HOME}/items/{item_id}", json={"text": "x"}).status_code == 404
        assert client.delete(f"{HOME}/items/{item_id}").status_code == 404

    with act_as(user_a) as client:
        assert [row["text"] for row in client.get(HOME).json()["interests"]] == ["哲学"]


def test_space_preferences_are_written_and_read_per_space(world, act_as):
    user_a, user_b, space_a, space_b = world
    with act_as(user_a) as client:
        created = client.post(
            f"/api/v1/projects/{space_a}/preferences",
            json={"text": "这个空间里讲详细一点"},
        )
        assert created.status_code == 201, created.text
        assert created.json()["projectId"] == str(space_a)

        assert [
            row["text"]
            for row in client.get(f"/api/v1/projects/{space_a}/preferences").json()
        ] == ["这个空间里讲详细一点"]
        # The other space is untouched — and so is Home.
        assert client.get(f"/api/v1/projects/{space_b}/preferences").json() == []
        assert client.get(HOME).json()["preferences"] == []

        # Idempotent on the same text.
        again = client.post(
            f"/api/v1/projects/{space_a}/preferences",
            json={"text": "这个空间里讲详细一点"},
        )
        assert again.status_code == 201
        assert len(client.get(f"/api/v1/projects/{space_a}/preferences").json()) == 1

        preference_id = created.json()["id"]
        assert (
            client.delete(
                f"/api/v1/projects/{space_a}/preferences/{preference_id}"
            ).status_code
            == 204
        )

    with act_as(user_b) as client:
        # A space that is not theirs is a 404, not an empty list.
        assert (
            client.post(
                f"/api/v1/projects/{space_a}/preferences", json={"text": "nope"}
            ).status_code
            == 404
        )


def test_nickname_keeps_its_own_endpoint(world, act_as):
    user_a, _user_b, _space_a, _space_b = world
    with act_as(user_a) as client:
        updated = client.patch("/api/v1/users/me", json={"nickname": "Ceaser"})
        assert updated.status_code == 200, updated.text
        assert updated.json()["nickname"] == "Ceaser"
        # Home shows it without owning it.
        assert client.get(HOME).json()["nickname"] == "Ceaser"
