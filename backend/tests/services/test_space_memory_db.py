"""Space Memory against a real database — skipped when none is reachable.

Why these live here rather than in the DB-free module: the behaviour that
matters is all in the queries. Continuity across conversations depends on
memories being keyed by SPACE; the IDOR rule depends on every read proving
ownership first; the dedup depends on "same text in the same space is one row".
None of that can be asserted against a stub without asserting the stub.

The whole module skips when Postgres is unreachable, so a checkout without the
local database (see .workbuddy/localdb/README.md) still runs the suite green.

Isolation: a throwaway auth user + profile + two spaces, deleted in teardown.
The delete cascades (auth.users → profiles → projects → space_memories), so no
row survives the run and the demo space is never touched.
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid

import pytest
from sqlalchemy import text

from core.database import AsyncSessionLocal, engine
from services import space_memory_service

MEMORY_ONE = "期末复习先重点解决 Eigenvector proof，暂时不急着学 diagonalization。"
MEMORY_TWO = "每周三晚上复习，周日做一次小测。"


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
def space():
    """(user_id, project_id, other_project_id) for a throwaway space."""

    async def _probe():
        async with engine.connect() as conn:
            await conn.execute(text("select 1"))

    try:
        run(_probe())
    except Exception as exc:  # noqa: BLE001 — any failure means "no database here"
        pytest.skip(f"no database reachable: {type(exc).__name__}: {exc}")

    ids = run(_create_space())
    yield ids
    run(_drop_space(ids[0]))


async def _create_space() -> tuple[uuid.UUID, uuid.UUID, uuid.UUID]:
    user_id, project_id, other_project_id = (uuid.uuid4() for _ in range(3))
    email = f"space-memory-test-{user_id}@example.test"
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
        for pid, name in (
            (project_id, "memory-test-space"),
            (other_project_id, "memory-test-other-space"),
        ):
            await conn.execute(
                text(
                    "insert into projects (id, user_id, name) "
                    "values (:id, :user_id, :name)"
                ),
                {"id": pid, "user_id": user_id, "name": name},
            )
    return user_id, project_id, other_project_id


async def _drop_space(user_id: uuid.UUID) -> None:
    # Cascades all the way down: profiles -> projects -> space_memories.
    async with engine.begin() as conn:
        await conn.execute(text("delete from auth.users where id = :id"), {"id": user_id})


async def _write(space, value: str, *, owned: bool = True, as_user: uuid.UUID | None = None):
    user_id, project_id, other_project_id = space
    async with AsyncSessionLocal() as db:
        return await space_memory_service.record(
            db,
            user_id=as_user or user_id,
            project_id=project_id if owned else other_project_id,
            text=value,
        )


async def _read(space, *, as_user: uuid.UUID | None = None, limit: int = 20):
    user_id, project_id, other_project_id = space
    async with AsyncSessionLocal() as db:
        rows = await space_memory_service.list_for_space(
            db, user_id=as_user or user_id, project_id=project_id, limit=limit
        )
        total = await space_memory_service.count_for_space(
            db, user_id=as_user or user_id, project_id=project_id
        )
        foreign = await space_memory_service.list_for_space(
            db, user_id=as_user or user_id, project_id=other_project_id, limit=limit
        )
        return rows, total, foreign


def test_a_memory_is_written_and_trimmed(space):
    memory, created = run(_write(space, f"  {MEMORY_ONE}  "))
    assert created is True
    assert memory.text == MEMORY_ONE
    assert memory.project_id == space[1]


def test_the_same_text_is_one_memory_not_two(space):
    first, created_first = run(_write(space, MEMORY_TWO))
    assert created_first is True
    again, created_again = run(_write(space, MEMORY_TWO))
    # Same row reused, so the agent can honestly say "already remembered".
    assert created_again is False
    assert again.id == first.id


def test_a_foreign_project_writes_nothing(space):
    assert run(_write(space, "not mine", as_user=uuid.uuid4())) is None


def test_reads_are_scoped_to_the_space_and_newest_first(space):
    rows, total, foreign = run(_read(space))
    assert rows is not None and foreign is not None
    texts = [memory.text for memory, _ in rows]
    assert texts[0] == MEMORY_TWO  # newest first
    assert MEMORY_ONE in texts
    assert total == len(rows)
    # The other space holds none of these — that is what "keyed by space" means.
    assert foreign == []


def test_the_limit_is_honoured_while_the_total_is_not(space):
    rows, _, _ = run(_read(space, limit=1))
    _, total, _ = run(_read(space))
    assert len(rows) == 1
    # The prompt says "…and N older memories not shown"; that count has to be
    # the whole truth, not the capped one.
    assert total >= 2


def test_a_foreign_space_reads_as_none(space):
    rows, total, foreign = run(_read(space, as_user=uuid.uuid4()))
    assert rows is None
    assert foreign is None
    assert total == 0
