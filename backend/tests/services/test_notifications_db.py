"""Notification Sender against a real database — skipped when none is reachable.

The behaviour that matters is all in the queries and the insert, so it cannot be
asserted against a stub without asserting the stub:

  * a sent notification survives (the feed reloads it after a refresh),
  * it comes back newest-first (that is the feed's ordering rule),
  * it is invisible to anybody else (the IDOR rule the rest of the app follows),
  * `metadata` round-trips as JSON, and an explicit timestamp is kept.

The whole module skips when Postgres is unreachable, so a checkout without the
local database (see .workbuddy/localdb/README.md) still runs the suite green.
It also needs the `notifications` table, i.e. `alembic upgrade head`.

Isolation: a throwaway auth user + profile, deleted in teardown. The delete
cascades (auth.users → profiles → notifications), so no row survives the run and
nothing a real learner sees is touched.
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import text

from core.database import AsyncSessionLocal, engine
from services import notification_service
from services.notification_service import NotificationInput

REMINDER_TITLE = "Review reminder"
REMINDER_BODY = "You studied Eigenvectors three days ago — worth re-checking the proof."


def run(coro):
    """asyncio.run with the pool drained on both sides.

    The engine is module-level and each test gets its own event loop; a
    connection pooled from a closed loop fails with "Event loop is closed".
    Draining is best-effort — disposing from the wrong loop only logs noise.
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


@pytest.fixture(scope="module")
def user():
    """A throwaway user id, plus a stranger id that must never see their feed."""

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
    email = f"notification-test-{user_id}@example.test"
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
    # Cascades: auth.users -> profiles -> notifications.
    async with engine.begin() as conn:
        await conn.execute(text("delete from auth.users where id = :id"), {"id": user_id})


async def _send(user, item: NotificationInput, *, as_user: uuid.UUID | None = None):
    user_id, stranger_id = user
    async with AsyncSessionLocal() as db:
        return await notification_service.send(
            db, user_id=as_user or user_id, notification=item
        )


async def _read(user, *, as_user: uuid.UUID | None = None, limit: int = 50):
    user_id, stranger_id = user
    async with AsyncSessionLocal() as db:
        return await notification_service.list_for_user(
            db, user_id=as_user or user_id, limit=limit
        )


def test_a_sent_notification_is_written_and_read_back(user):
    sent = run(_send(user, NotificationInput(title=REMINDER_TITLE, body=REMINDER_BODY)))
    assert sent.id is not None
    assert sent.type == "reminder"
    assert sent.timestamp is not None  # the database's now(), never null

    rows = run(_read(user))
    stored = {row.id: row for row in rows}
    assert sent.id in stored
    assert stored[sent.id].title == REMINDER_TITLE
    assert stored[sent.id].body == REMINDER_BODY


def test_the_feed_is_newest_first(user):
    older = run(
        _send(
            user,
            NotificationInput(
                title="Older",
                timestamp=datetime.now(UTC) - timedelta(days=3),
            ),
        )
    )
    newer = run(_send(user, NotificationInput(title="Newer")))
    rows = run(_read(user))
    ids = [row.id for row in rows]
    assert ids.index(newer.id) < ids.index(older.id)
    # The explicit timestamp is kept, not rewritten to the insert time.
    stored = {row.id: row for row in rows}
    assert stored[older.id].timestamp < stored[newer.id].timestamp


def test_metadata_round_trips_as_structure(user):
    sent = run(
        _send(
            user,
            NotificationInput(
                title="Review reminder",
                metadata={"knowledgeItem": "eigenvector", "attempt": 3, "nested": {"a": 1}},
            ),
        )
    )
    stored = {row.id: row for row in run(_read(user))}[sent.id]
    assert stored.metadata == {
        "knowledgeItem": "eigenvector",
        "attempt": 3,
        "nested": {"a": 1},
    }


def test_a_stranger_sees_none_of_it(user):
    """Reads are scoped to the token's user: there is no way to read someone
    else's feed, and a stranger's feed is simply empty."""
    user_id, stranger_id = user
    assert run(_read(user, as_user=stranger_id)) == []


def test_the_limit_is_honoured(user):
    run(_send(user, NotificationInput(title="paged")))
    assert len(run(_read(user, limit=1))) == 1


def test_a_refused_notification_writes_no_row(user):
    """Validation happens before the session is used, so a bad payload cannot
    leave a half-written feed item behind."""
    user_id, stranger_id = user
    before = len(run(_read(user)))

    async def _bad_send():
        async with AsyncSessionLocal() as db:
            with pytest.raises(notification_service.InvalidNotification):
                await notification_service.send(
                    db,
                    user_id=user_id,
                    notification=NotificationInput(title="   "),
                )

    run(_bad_send())
    assert len(run(_read(user))) == before
