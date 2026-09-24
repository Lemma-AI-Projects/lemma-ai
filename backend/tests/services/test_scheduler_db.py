"""Scheduler against a real database — the six tests the brief names.

Every one of them is a property of the *persisted* state machine, which is why
they need a real table and not a stub:

  Test 1  a created task is stored and shows up in the plan (the Calendar read)
  Test 2  when its time has come it fires and the notification reaches the Feed
  Test 3  a fresh read (a page refresh) sees the same task, unchanged
  Test 4  a process restart loses nothing: pending tasks are still pending and
          fire on the first tick afterwards
  Test 5  a cancelled task never fires
  Test 6  an executed task never fires twice — not on a second tick, not on a
          second manual trigger, not when the two race

Time is always passed in explicitly (`run_due(now=...)`), so nothing here sleeps
and nothing depends on the wall clock: "in the future" and "in the past" are
constructed, not waited for.

The module skips when Postgres is unreachable (see .workbuddy/localdb/README.md)
and needs `alembic upgrade head` for the `scheduled_tasks` table.
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import text

from core.database import AsyncSessionLocal, engine
from models.scheduled_task import (
    STATUS_CANCELLED,
    STATUS_EXECUTED,
    STATUS_FAILED,
    STATUS_PENDING,
    ScheduledTask,
)
from services import notification_service, scheduler_service
from services.scheduler_service import (
    TYPE_NOTIFICATION,
    InvalidTask,
    NotCancellable,
    TaskInput,
)

TITLE = "Review reminder"
BODY = "Eigenvector proof — worth another look."


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


@pytest.fixture()
def user():
    """A throwaway user per test, plus a stranger whose tasks stay invisible.

    Function-scoped on purpose: these tests are about what the Scheduler leaves
    behind (pending rows, delivered notifications), so a shared user would make
    every "nothing else fired" assertion depend on the order the file happens to
    run in. A fresh user per test makes each assertion local.

    Skips when Postgres is unreachable, and the teardown cascades
    (auth.users -> profiles -> scheduled_tasks + notifications).
    """

    async def _probe():
        async with engine.connect() as conn:
            await conn.execute(text("select 1"))

    try:
        run(_probe())
    except Exception as exc:  # noqa: BLE001 — any failure means "no database here"
        pytest.skip(f"no database reachable: {type(exc).__name__}: {exc}")

    user_id = run(_create_user())
    yield user_id, uuid.uuid4()
    run(_drop_user(user_id))


async def _create_user() -> uuid.UUID:
    user_id = uuid.uuid4()
    email = f"scheduler-test-{user_id}@example.test"
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
    # Cascades: auth.users -> profiles -> scheduled_tasks + notifications.
    async with engine.begin() as conn:
        await conn.execute(text("delete from auth.users where id = :id"), {"id": user_id})


def notification_payload(title: str = TITLE) -> dict:
    return {"title": title, "body": BODY}


async def _schedule(
    user, *, in_seconds: float, payload: dict | None = None, as_user: uuid.UUID | None = None
):
    user_id, stranger_id = user
    async with AsyncSessionLocal() as db:
        return await scheduler_service.schedule(
            db,
            user_id=as_user or user_id,
            task=TaskInput(
                run_at=datetime.now(UTC) + timedelta(seconds=in_seconds),
                type=TYPE_NOTIFICATION,
                payload=payload or notification_payload(),
            ),
        )


async def _list(user, *, status=None, as_user: uuid.UUID | None = None):
    user_id, stranger_id = user
    async with AsyncSessionLocal() as db:
        return await scheduler_service.list_for_user(
            db, user_id=as_user or user_id, status=status
        )


async def _tick(*, in_seconds: float = 0.0, limit: int = scheduler_service.DUE_BATCH):
    """One turn of the clock, with the clock handed in."""
    async with AsyncSessionLocal() as db:
        return await scheduler_service.run_due(
            db, now=datetime.now(UTC) + timedelta(seconds=in_seconds), limit=limit
        )


async def _trigger(task_id: uuid.UUID):
    async with AsyncSessionLocal() as db:
        row = await db.get(ScheduledTask, task_id)
        return await scheduler_service.trigger(db, task=row)


async def _notifications(user, *, as_user: uuid.UUID | None = None):
    user_id, stranger_id = user
    async with AsyncSessionLocal() as db:
        return await notification_service.list_for_user(
            db, user_id=as_user or user_id
        )


async def _pending_titles(user):
    return [row.title for row in await _notifications(user)]


# --- Test 1: a created task is in the plan --------------------------------


def test_1_a_scheduled_task_is_stored_and_listed(user):
    task = run(_schedule(user, in_seconds=3600))

    assert task.status == STATUS_PENDING
    assert task.type == TYPE_NOTIFICATION
    assert task.payload["title"] == TITLE
    assert task.executed_at is None and task.error is None

    listed = {row.id: row for row in run(_list(user))}
    assert task.id in listed
    # The plan reads forwards in time — that is the Calendar's order.
    assert [row.run_at for row in run(_list(user))] == sorted(
        row.run_at for row in run(_list(user))
    )


def test_1b_a_foreign_task_is_invisible(user):
    user_id, stranger_id = user
    task = run(_schedule(user, in_seconds=3600))
    assert task.id not in {row.id for row in run(_list(user, as_user=stranger_id))}
    assert run(_list(user, status=STATUS_PENDING, as_user=stranger_id)) == []


# --- Test 2: due -> Notification Sender -> Feed ---------------------------


def test_2_a_due_task_fires_and_the_notification_reaches_the_feed(user):
    task = run(_schedule(user, in_seconds=-1))

    fired = run(_tick())
    assert [row.id for row in fired] == [task.id]

    executed = {row.id: row for row in run(_list(user))}[task.id]
    assert executed.status == STATUS_EXECUTED
    # WHEN it actually happened is recorded, and it is not the same fact as
    # when it was due.
    assert executed.executed_at is not None
    assert executed.executed_at >= executed.run_at - timedelta(seconds=1)

    feed = {row.title: row for row in run(_notifications(user))}
    assert TITLE in feed
    assert feed[TITLE].body == BODY
    # Provenance: the delivered notification points back at the promise.
    assert feed[TITLE].metadata["scheduledTaskId"] == str(task.id)


def test_2b_a_task_in_the_future_does_not_fire(user):
    task = run(_schedule(user, in_seconds=600))
    assert run(_tick()) == []
    assert {row.id: row for row in run(_list(user))}[task.id].status == STATUS_PENDING


def test_2c_the_tick_respects_its_batch_limit(user):
    for _ in range(3):
        run(_schedule(user, in_seconds=-1))
    fired = run(_tick(limit=2))
    assert len(fired) == 2
    assert len(run(_list(user, status=STATUS_PENDING))) >= 1


# --- Test 3 / Test 4: refresh and restart ---------------------------------


def test_3_a_fresh_read_sees_the_same_task(user):
    """A page refresh is a new session reading the same rows — nothing lives in
    the page, so there is nothing to lose."""
    task = run(_schedule(user, in_seconds=1800))

    async def _reopen():
        # A brand-new session: no identity map, no cached objects.
        async with AsyncSessionLocal() as db:
            return await scheduler_service.list_for_user(db, user_id=user[0])

    again = {row.id: row for row in run(_reopen())}
    assert again[task.id].status == STATUS_PENDING
    assert again[task.id].payload == task.payload


def test_4_a_restart_recovers_pending_tasks(user):
    """Simulates a process restart: the pool is disposed (every connection gone,
    as if the process had exited) before the plan is read and the clock ticks."""
    task = run(_schedule(user, in_seconds=-1))

    async def _restart_and_tick():
        # What `lifespan` does after a restart: throw the pool away, ask the
        # table how many promises are outstanding, then run the first tick.
        await engine.dispose()
        async with AsyncSessionLocal() as db:
            pending = await scheduler_service.count_pending(db)
            due = await scheduler_service.run_due(db)
            return pending, due

    pending, due = run(_restart_and_tick())
    assert pending >= 1  # visible to the startup probe, not lost
    assert [row.id for row in due] == [task.id]

    restarted = {row.id: row for row in run(_list(user))}[task.id]
    assert restarted.status == STATUS_EXECUTED


# --- Test 5: cancel -------------------------------------------------------


def test_5_a_cancelled_task_never_fires(user):
    task = run(_schedule(user, in_seconds=-1))  # already due: it WOULD fire

    async def _cancel():
        async with AsyncSessionLocal() as db:
            return await scheduler_service.cancel(
                db, user_id=user[0], task_id=task.id
            )

    cancelled = run(_cancel())
    assert cancelled is not None and cancelled.status == STATUS_CANCELLED

    assert run(_tick()) == []
    assert {row.id: row for row in run(_list(user))}[task.id].status == STATUS_CANCELLED
    assert TITLE not in {
        row.title for row in run(_notifications(user)) if row.metadata.get("scheduledTaskId") == str(task.id)
    }


def test_5b_cancelling_someone_elses_task_is_a_no_op(user):
    task = run(_schedule(user, in_seconds=3600))

    async def _cancel_foreign():
        async with AsyncSessionLocal() as db:
            return await scheduler_service.cancel(
                db, user_id=user[1], task_id=task.id
            )

    assert run(_cancel_foreign()) is None
    # And the task is untouched.
    assert {row.id: row for row in run(_list(user))}[task.id].status == STATUS_PENDING


def test_5c_cancelling_an_executed_task_says_so(user):
    task = run(_schedule(user, in_seconds=-1))
    run(_tick())

    async def _cancel():
        async with AsyncSessionLocal() as db:
            with pytest.raises(NotCancellable) as excinfo:
                await scheduler_service.cancel(
                    db, user_id=user[0], task_id=task.id
                )
            return excinfo.value.status

    assert run(_cancel()) == STATUS_EXECUTED


# --- Test 6: never twice --------------------------------------------------


def test_6_a_second_tick_does_not_fire_again(user):
    task = run(_schedule(user, in_seconds=-1))

    assert [row.id for row in run(_tick())] == [task.id]
    # The time is still in the past and the row is still there — only its status
    # changed, and that is what makes the clock walk past it.
    assert run(_tick()) == []

    sent = [
        row
        for row in run(_notifications(user))
        if row.metadata.get("scheduledTaskId") == str(task.id)
    ]
    assert len(sent) == 1


def test_6b_a_manual_trigger_after_the_clock_loses_the_race(user):
    """Claim-then-act: the loser of the race does nothing at all, and no second
    notification is produced."""
    task = run(_schedule(user, in_seconds=-1))
    run(_tick())
    assert run(_trigger(task.id)) is None

    sent = [
        row
        for row in run(_notifications(user))
        if row.metadata.get("scheduledTaskId") == str(task.id)
    ]
    assert len(sent) == 1


def test_6c_the_claim_is_atomic_under_two_concurrent_triggers(user):
    """Two triggers of the same task at the same moment: one notification.

    This is the property the whole design rests on, so it is exercised with real
    concurrency rather than by calling `trigger` twice in a row.
    """
    task = run(_schedule(user, in_seconds=-1))

    async def _race():
        async def one():
            async with AsyncSessionLocal() as db:
                row = await db.get(ScheduledTask, task.id)
                return await scheduler_service.trigger(db, task=row)

        return await asyncio.gather(one(), one())

    results = run(_race())
    assert sum(1 for result in results if result is not None) == 1

    sent = [
        row
        for row in run(_notifications(user))
        if row.metadata.get("scheduledTaskId") == str(task.id)
    ]
    assert len(sent) == 1


# --- the failure path is a record, not a crash ----------------------------


def test_a_failing_handler_marks_the_task_failed_with_a_reason(user, monkeypatch):
    task = run(_schedule(user, in_seconds=-1))

    async def boom(db, *, task):  # noqa: ARG001 — the handler signature
        raise RuntimeError("sender exploded")

    monkeypatch.setitem(scheduler_service._HANDLERS, TYPE_NOTIFICATION, boom)

    fired = run(_tick())
    assert [row.id for row in fired] == [task.id]
    assert fired[0].status == STATUS_FAILED
    assert "sender exploded" in (fired[0].error or "")

    # And it is terminal: a later tick does not retry it into a duplicate.
    assert run(_tick()) == []


# --- validation happens before anything is written ------------------------


def test_an_invalid_task_is_refused_without_a_row(user):
    user_id, stranger_id = user
    before = len(run(_list(user)))

    async def _bad():
        async with AsyncSessionLocal() as db:
            with pytest.raises(InvalidTask):
                await scheduler_service.schedule(
                    db,
                    user_id=user_id,
                    task=TaskInput(
                        run_at=datetime(2026, 9, 25, 19, 0),  # naive
                        type=TYPE_NOTIFICATION,
                        payload=notification_payload(),
                    ),
                )

    run(_bad())
    assert len(run(_list(user))) == before


# --- the clock itself (not `run_due` called by hand) ----------------------


def test_the_real_clock_fires_a_due_task_without_being_asked(user):
    """The loop from `run_forever`, running for real with a fast poll.

    Everything else in this file hands `run_due` an explicit `now` for
    determinism; this one is the counterweight — it proves the thing the app's
    lifespan starts actually fires what has come due, on its own, with no caller.
    """
    task = run(_schedule(user, in_seconds=-1))

    async def _let_the_clock_run():
        clock = asyncio.create_task(scheduler_service.run_forever(0.2))
        try:
            for _ in range(50):  # up to ~5s of real waiting, usually one tick
                await asyncio.sleep(0.1)
                async with AsyncSessionLocal() as db:
                    rows = await scheduler_service.list_for_user(db, user_id=user[0])
                if any(
                    row.id == task.id and row.status == STATUS_EXECUTED for row in rows
                ):
                    return True
            return False
        finally:
            clock.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await clock

    assert run(_let_the_clock_run()) is True

    async def _read_feed():
        async with AsyncSessionLocal() as db:
            return await notification_service.list_for_user(db, user_id=user[0])

    feed = run(_read_feed())
    assert [row.title for row in feed] == [TITLE]
    assert feed[0].metadata["scheduledTaskId"] == str(task.id)
