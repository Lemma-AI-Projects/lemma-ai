"""The Scheduler's HTTP surface: schedule, list, cancel, fire.

What is asserted here is what the frontend and a future Global Agent will
actually depend on:

  * the wire shape (camelCase `runAt` / `executedAt`, ISO 8601 with an offset),
  * the refusal codes (422 for an un-keepable task, 404 for a foreign id, 409 for
    a task that is no longer pending),
  * and the **whole chain over HTTP**: `POST /scheduled-tasks` with a `runAt` in
    the past, one tick, and the notification is in `GET /notifications`. That is
    the acceptance path, exercised end to end without a browser.

Auth is the only thing faked (a `CurrentUser` in place of a token); everything
downstream runs for real against the local database. The skip/session rules are
the same as `test_notifications_api.py` — `asyncio.run()` must not run inside the
TestClient block, which owns the event loop.
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from core.config import settings
from core.database import AsyncSessionLocal, engine, get_db
from core.security import CurrentUser, get_current_user
from main import app
from services import scheduler_service
from services.scheduler_service import TaskInput

TITLE = "Review reminder"
BODY = "Eigenvector proof — worth another look."


def run(coro):
    """asyncio.run with the pool drained on both sides (see test_notifications_db).

    Only for work done OUTSIDE the TestClient block (fixtures). Inside a test the
    client owns the loop and the shared engine's pooled connections belong to it —
    see `run_private`.
    """

    async def wrapper():
        with contextlib.suppress(Exception):
            await engine.dispose()
        try:
            return await coro
        finally:
            with contextlib.suppress(Exception):
                await engine.dispose()

    return asyncio.run(wrapper())


def run_private(work):
    """Run `work(private_engine)` in its own loop, on its own engine.

    Needed wherever a test has to touch the database directly while a TestClient
    is open: handing one of the shared engine's pooled connections to a second
    event loop is what produces "got Future … attached to a different loop" —
    intermittently, which is worse than always. A one-off engine has no history
    with any loop.
    """

    async def wrapper():
        private = create_async_engine(settings.database_url)
        try:
            return await work(private)
        finally:
            await private.dispose()

    return asyncio.run(wrapper())


async def _create_user(target=None) -> uuid.UUID:
    """A throwaway user, on `target` (the shared engine by default)."""
    user_id = uuid.uuid4()
    email = f"scheduler-api-test-{user_id}@example.test"
    bind = target if target is not None else engine
    async with bind.begin() as conn:
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


async def _drop_user(user_id: uuid.UUID, target=None) -> None:
    bind = target if target is not None else engine
    async with bind.begin() as conn:
        await conn.execute(text("delete from auth.users where id = :id"), {"id": user_id})


@pytest.fixture()
def client():
    """An unauthenticated client — the real dependency chain, no token."""
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


@pytest.fixture()
def authed_client(monkeypatch):
    """A client whose caller is a throwaway user, with a real database session.

    The Scheduler's clock is switched OFF for these tests: they fire tasks by
    hand, and a background tick stealing a task between the POST and the
    assertion would make "this call fired it" flaky. The clock itself is tested
    where it belongs — `test_scheduler_db.py` starts a real loop and lets it run.
    """
    monkeypatch.setattr(settings, "scheduler_enabled", False)

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
            yield test_client, user_id
    finally:
        app.dependency_overrides.clear()
        run(_drop_user(user_id))


def _payload(*, seconds_from_now: float = 3600, title: str = TITLE) -> dict:
    return {
        "runAt": (datetime.now(UTC) + timedelta(seconds=seconds_from_now)).isoformat(),
        "type": "notification",
        "payload": {"title": title, "body": BODY},
    }


# --- auth -------------------------------------------------------------------


def test_the_scheduler_requires_a_token(client):
    assert client.get("/api/v1/scheduled-tasks").status_code == 401
    assert client.post("/api/v1/scheduled-tasks", json=_payload()).status_code == 401


# --- the wire shape ---------------------------------------------------------


def test_create_returns_the_task_in_camel_case(authed_client):
    client, _user = authed_client
    response = client.post("/api/v1/scheduled-tasks", json=_payload())
    assert response.status_code == 201, response.text

    task = response.json()
    assert set(task) == {
        "id",
        "runAt",
        "type",
        "payload",
        "status",
        "createdAt",
        "executedAt",
        "error",
    }
    assert task["status"] == "pending"
    assert task["type"] == "notification"
    assert task["payload"]["title"] == TITLE
    assert task["executedAt"] is None and task["error"] is None
    # Offset-aware on the way out as well as in: the Calendar places the item by
    # this value, so it must never be a bare local string.
    assert datetime.fromisoformat(task["runAt"]).tzinfo is not None
    uuid.UUID(task["id"])


def test_the_plan_is_listed_in_time_order(authed_client):
    client, _user = authed_client
    later = client.post(
        "/api/v1/scheduled-tasks", json=_payload(seconds_from_now=7200, title="Later")
    ).json()
    sooner = client.post(
        "/api/v1/scheduled-tasks", json=_payload(seconds_from_now=60, title="Sooner")
    ).json()

    listed = client.get("/api/v1/scheduled-tasks").json()
    ids = [task["id"] for task in listed]
    assert ids.index(sooner["id"]) < ids.index(later["id"])

    pending_only = client.get(
        "/api/v1/scheduled-tasks", params={"status": "pending"}
    ).json()
    assert {task["id"] for task in pending_only} == set(ids)


def test_an_un_keepable_task_is_a_422(authed_client):
    client, _user = authed_client

    # No offset: the Scheduler refuses to guess which clock was meant.
    naive = client.post(
        "/api/v1/scheduled-tasks",
        json={
            "runAt": "2026-09-25T19:00:00",
            "type": "notification",
            "payload": {"title": TITLE},
        },
    )
    assert naive.status_code == 422

    # A type with no handler.
    unknown = client.post(
        "/api/v1/scheduled-tasks",
        json={
            "runAt": datetime.now(UTC).isoformat(),
            "type": "send_email",
            "payload": {"to": "a@b.c"},
        },
    )
    assert unknown.status_code == 422

    # A notification with nothing to say.
    empty = client.post(
        "/api/v1/scheduled-tasks",
        json={
            "runAt": datetime.now(UTC).isoformat(),
            "type": "notification",
            "payload": {"body": "no title"},
        },
    )
    assert empty.status_code == 422

    assert client.get("/api/v1/scheduled-tasks").json() == []


# --- cancel / run -----------------------------------------------------------


def test_cancel_takes_the_task_out_of_the_plan(authed_client):
    client, _user = authed_client
    task = client.post("/api/v1/scheduled-tasks", json=_payload(seconds_from_now=-1)).json()

    cancelled = client.post(f"/api/v1/scheduled-tasks/{task['id']}/cancel")
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    assert client.get("/api/v1/scheduled-tasks").json()[0]["status"] == "cancelled"


def test_cancelling_twice_is_a_409(authed_client):
    client, _user = authed_client
    task = client.post("/api/v1/scheduled-tasks", json=_payload()).json()
    assert client.post(f"/api/v1/scheduled-tasks/{task['id']}/cancel").status_code == 200
    assert client.post(f"/api/v1/scheduled-tasks/{task['id']}/cancel").status_code == 409


def test_a_foreign_task_is_a_404(authed_client):
    client, _user = authed_client
    missing = uuid.uuid4()
    assert client.post(f"/api/v1/scheduled-tasks/{missing}/cancel").status_code == 404
    assert client.post(f"/api/v1/scheduled-tasks/{missing}/run").status_code == 404


def test_running_a_task_immediately_writes_the_notification(authed_client):
    """The `/run` path: the same code the clock takes, so the chain is testable
    in a second instead of in thirty."""
    client, _user = authed_client
    task = client.post(
        "/api/v1/scheduled-tasks", json=_payload(seconds_from_now=3600)
    ).json()

    fired = client.post(f"/api/v1/scheduled-tasks/{task['id']}/run")
    assert fired.status_code == 200
    assert fired.json()["status"] == "executed"
    assert fired.json()["executedAt"] is not None

    feed = client.get("/api/v1/notifications").json()
    assert [item["title"] for item in feed] == [TITLE]
    assert feed[0]["body"] == BODY
    assert feed[0]["metadata"]["scheduledTaskId"] == task["id"]

    # And it cannot be run a second time (that would be the duplicate reminder the
    # whole design exists to prevent).
    assert client.post(f"/api/v1/scheduled-tasks/{task['id']}/run").status_code == 409
    assert len(client.get("/api/v1/notifications").json()) == 1


# --- the acceptance path: schedule -> wait -> notification ------------------


def test_the_clock_fires_a_due_task_and_the_feed_shows_it(authed_client):
    """`POST` a task whose time has come, run one tick, read the Feed.

    No browser, no waiting: this is the whole Scheduler chain — task -> claim ->
    Notification Sender -> notifications row — over the real HTTP surface.
    """
    client, user_id = authed_client
    task = client.post(
        "/api/v1/scheduled-tasks", json=_payload(seconds_from_now=-5)
    ).json()

    async def _tick(target):
        async with async_sessionmaker(target, expire_on_commit=False)() as db:
            return await scheduler_service.run_due(db)

    fired = run_private(_tick)
    assert [row.id for row in fired] == [uuid.UUID(task["id"])]
    assert fired[0].status == "executed"

    # The plan still holds it, now executed — the Calendar keeps history instead
    # of the task vanishing once it fires.
    tasks = client.get("/api/v1/scheduled-tasks").json()
    assert tasks[0]["status"] == "executed"

    feed = client.get("/api/v1/notifications").json()
    assert feed[0]["title"] == TITLE
    assert feed[0]["metadata"]["scheduledTaskId"] == task["id"]


def test_a_task_is_invisible_to_another_user(authed_client):
    """Ownership is never a parameter: a task created for this user is invisible
    to anyone else, and there is no id to guess that changes that."""
    client, _user = authed_client
    task = client.post("/api/v1/scheduled-tasks", json=_payload()).json()

    stranger = run_private(_create_user)
    try:

        async def _stranger_view(target):
            async with async_sessionmaker(target, expire_on_commit=False)() as db:
                one = await scheduler_service.get_for_user(
                    db, user_id=stranger, task_id=uuid.UUID(task["id"])
                )
                plan = await scheduler_service.list_for_user(db, user_id=stranger)
                return one, plan

        one, plan = run_private(_stranger_view)
        assert one is None
        assert plan == []
    finally:
        run_private(lambda target: _drop_user(stranger, target))


def test_a_hand_built_task_row_still_goes_through_the_sender(authed_client):
    """The Global Agent's future path: a backend caller schedules *in process*
    with a session it already holds, and does not need HTTP at all."""
    client, user_id = authed_client

    async def _schedule_directly(target):
        async with async_sessionmaker(target, expire_on_commit=False)() as db:
            return await scheduler_service.schedule(
                db,
                user_id=user_id,
                task=TaskInput(
                    run_at=datetime.now(UTC) - timedelta(seconds=1),
                    payload={"title": TITLE, "body": BODY},
                ),
            )

    task = run_private(_schedule_directly)
    assert task.status == "pending"
    feed = client.get("/api/v1/notifications").json()
    assert feed == []  # not fired yet — scheduling is not firing

    async def _tick(target):
        async with async_sessionmaker(target, expire_on_commit=False)() as db:
            return await scheduler_service.run_due(db)

    run_private(_tick)
    assert [item["title"] for item in client.get("/api/v1/notifications").json()] == [
        TITLE
    ]
