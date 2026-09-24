"""The notifications surface over HTTP: send, read, refuse.

Three things are checked, and each of them is a real risk in this feature:

  * **The wire shape.** The feed's frontend reads camelCase (`timestamp`,
    `metadata`) off a frozen dataclass the service returns; serialisation is the
    seam where a rename would silently break the Calendar, so it is asserted.
  * **The Feed read is the caller's.** No token -> 401. There is no user
    parameter to get wrong, which is the point.
  * **A refused payload is a 422, not a 500 and not a silent drop.**

The DB-backed cases skip when Postgres is unreachable (see
.workbuddy/localdb/README.md) and need `alembic upgrade head`. `asyncio.run()`
must not run inside the TestClient block — the client owns the event loop — so
every direct database call happens before or after it.
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

BODY = "You studied Eigenvectors three days ago — worth re-checking the proof."


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


async def _create_user() -> uuid.UUID:
    user_id = uuid.uuid4()
    email = f"notification-api-test-{user_id}@example.test"
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
    return user_id


async def _drop_user(user_id: uuid.UUID) -> None:
    async with engine.begin() as conn:
        await conn.execute(text("delete from auth.users where id = :id"), {"id": user_id})


@pytest.fixture()
def client():
    """An unauthenticated client — the real dependency chain, no token."""
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


@pytest.fixture()
def authed_client():
    """A client whose caller is a throwaway user, with a real database session.

    Auth is the only thing faked: the token is replaced by the `CurrentUser` the
    dependency would have produced, so everything downstream (ownership, insert,
    serialisation) runs for real.
    """

    async def _probe():
        async with engine.connect() as conn:
            await conn.execute(text("select 1"))

    try:
        run(_probe())
    except Exception as exc:  # noqa: BLE001 — any failure means "no database here"
        pytest.skip(f"no database reachable: {type(exc).__name__}: {exc}")

    user_id = run(_create_user())

    async def _session():
        async with AsyncSessionLocal() as session:
            yield session

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email=None
    )
    app.dependency_overrides[get_db] = _session
    try:
        with TestClient(app, raise_server_exceptions=False) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
        run(_drop_user(user_id))


# --- the read is the caller's, and only the caller's ------------------------


def test_the_feed_requires_a_token(client):
    assert client.get("/api/v1/notifications").status_code == 401


def test_sending_requires_a_token(client):
    assert (
        client.post("/api/v1/notifications", json={"title": "hi"}).status_code == 401
    )


def test_a_bad_payload_is_a_422_not_a_500(authed_client):
    """The sender refuses an unknown type — and the API says so instead of
    writing a feed item nobody can style."""
    response = authed_client.post(
        "/api/v1/notifications", json={"title": "hi", "type": "urgent_review"}
    )
    assert response.status_code == 422
    assert "urgent_review" in response.json()["detail"]

    # And an empty title never reaches the sender at all: the schema catches it.
    assert (
        authed_client.post(
            "/api/v1/notifications", json={"title": ""}
        ).status_code
        == 422
    )


# --- the wire shape the Calendar reads ---------------------------------------


def test_send_returns_the_item_in_camel_case(authed_client):
    response = authed_client.post(
        "/api/v1/notifications",
        json={
            "title": "Review reminder",
            "body": BODY,
            "metadata": {"source": "manual_test"},
        },
    )
    assert response.status_code == 201, response.text

    item = response.json()
    assert set(item) == {"id", "title", "body", "type", "timestamp", "metadata"}
    assert item["type"] == "reminder"  # the default, applied by the sender
    assert item["title"] == "Review reminder"
    assert item["body"] == BODY
    assert item["timestamp"]  # ISO 8601 from the database's now()
    assert item["metadata"] == {"source": "manual_test"}
    uuid.UUID(item["id"])  # a real id, not a placeholder


def test_a_sent_notification_is_then_in_the_feed(authed_client):
    sent = authed_client.post(
        "/api/v1/notifications", json={"title": "Review reminder", "body": BODY}
    ).json()

    feed = authed_client.get("/api/v1/notifications")
    assert feed.status_code == 200
    ids = [item["id"] for item in feed.json()]
    assert sent["id"] in ids
    # Newest first, and this one is the newest thing in a fresh user's feed.
    assert ids[0] == sent["id"]


def test_the_feed_is_empty_for_a_user_who_was_never_told_anything(authed_client):
    """An empty feed is `[]`, not a 404: "nothing yet" is a normal answer and the
    Calendar renders it as "no items", not as an error."""
    assert authed_client.get("/api/v1/notifications").json() == []
