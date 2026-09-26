"""Starting a session: resume, or start over — against a real database.

The two behaviours are opposites and both have to hold:

- **default** — reopen the same session. This is what makes a refresh safe, and
  what stops a second planning call from being paid for.
- **`restart=True`** — archive the old row and plan a fresh one. Without it a
  lesson that has been taught to its end resumes *past* its last step and plays
  nothing, so there is no second pass at any lesson, ever.

`plan_session` is monkeypatched: this module is about which row ends up in force,
not about what the model writes on the board.

Skips when Postgres is unreachable. Isolation: throwaway auth user + profile +
course, deleted in teardown (the delete cascades).
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import uuid

import pytest
from sqlalchemy import text

from ai.free_course.teaching import TeachingSessionPlan, TeachingStep
from core.database import AsyncSessionLocal, engine
from services import free_course_session_service

PLAN_STEPS = 3


def run(coro):
    """asyncio.run with the pool drained on both sides (see test_space_memory_db)."""

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
def course():
    """(user_id, course_id, chapters) with two lessons that both have content."""

    async def _probe():
        async with engine.connect() as conn:
            await conn.execute(text("select 1"))

    try:
        run(_probe())
    except Exception as exc:  # noqa: BLE001 — any failure means "no database here"
        pytest.skip(f"no database reachable: {type(exc).__name__}: {exc}")

    ids = run(_create())
    yield ids
    run(_drop(ids[0]))


async def _create():
    user_id, course_id, unit_id = (uuid.uuid4() for _ in range(3))
    one, two = uuid.uuid4(), uuid.uuid4()
    email = f"free-course-restart-{user_id}@example.test"
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
            text(
                "insert into courses "
                "(id, user_id, topic, title, status, search_status, mode) "
                "values (:id, :user_id, 'restart fixture', 'restart fixture', "
                "'ready', 'searched', 'free')"
            ),
            {"id": course_id, "user_id": user_id},
        )
        await conn.execute(
            text(
                "insert into course_units "
                "(id, course_id, order_index, title, status) "
                "values (:id, :course_id, 0, 'Unit', 'not_started')"
            ),
            {"id": unit_id, "course_id": course_id},
        )
        for index, chapter_id in enumerate((one, two)):
            await conn.execute(
                text(
                    "insert into course_chapters "
                    "(id, unit_id, order_index, title, status) "
                    "values (:id, :unit_id, :index, :title, 'not_started')"
                ),
                {
                    "id": chapter_id,
                    "unit_id": unit_id,
                    "index": index,
                    "title": f"Lesson {index + 1}",
                },
            )
            # Content must exist or `start_session` short-circuits to "empty"
            # and never reaches the planning path.
            await conn.execute(
                text(
                    "insert into course_lesson_objects "
                    "(id, chapter_id, order_index, kind, title, body, difficulty) "
                    "values (:id, :chapter_id, 0, 'explanation', 'Read', 'body', 'core')"
                ),
                {"id": uuid.uuid4(), "chapter_id": chapter_id},
            )
    return user_id, course_id, {"one": one, "two": two}


async def _drop(user_id: uuid.UUID) -> None:
    async with engine.begin() as conn:
        await conn.execute(
            text("delete from auth.users where id = :id"), {"id": user_id}
        )


def _stub_plan(monkeypatch):
    """A deterministic plan, so no model call happens in this module."""

    async def fake_plan_session(**kwargs) -> TeachingSessionPlan:
        return TeachingSessionPlan(
            title=str(kwargs.get("lesson_title") or "t"),
            objective=str(kwargs.get("objective") or "o"),
            steps=[
                TeachingStep(id=f"s{i}", narration="第一句。第二句。")
                for i in range(PLAN_STEPS)
            ],
        )

    monkeypatch.setattr(free_course_session_service, "plan_session", fake_plan_session)


async def _session_rows(chapter_id: uuid.UUID) -> list[dict]:
    async with engine.begin() as conn:
        rows = (
            await conn.execute(
                text(
                    "select id, status, cursor from free_course_sessions "
                    "where chapter_id = :chapter_id order by created_at"
                ),
                {"chapter_id": chapter_id},
            )
        ).mappings().all()
    return [dict(row) for row in rows]


async def _finish(chapter_id: uuid.UUID) -> uuid.UUID:
    """Put an already-taught session in place (cursor at the end of the plan)."""
    session_id = uuid.uuid4()
    plan = {
        "title": "t",
        "objective": "o",
        "steps": [{"id": f"s{i}", "narration": "第一句。"} for i in range(PLAN_STEPS)],
    }
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "insert into free_course_sessions "
                "(id, chapter_id, status, cursor, plan_json, transcript_json) "
                "values (:id, :chapter_id, 'active', :cursor, "
                " cast(:plan as jsonb), '[]'::jsonb)"
            ),
            {
                "id": session_id,
                "chapter_id": chapter_id,
                "cursor": PLAN_STEPS,
                "plan": json.dumps(plan),
            },
        )
    return session_id


async def _start(user_id, course_id, chapter_id, *, restart: bool):
    async with AsyncSessionLocal() as db:
        return await free_course_session_service.start_session(
            db,
            user_id=user_id,
            course_id=course_id,
            chapter_id=chapter_id,
            restart=restart,
        )


# --- resume (the default) ---------------------------------------------------


def test_opening_an_unstarted_lesson_plans_one(course, monkeypatch):
    _stub_plan(monkeypatch)
    user_id, course_id, chapters = course
    session = run(_start(user_id, course_id, chapters["one"], restart=False))
    assert session is not None
    assert session.cursor == 0
    assert len(session.steps) == PLAN_STEPS


def test_reopening_resumes_and_does_not_plan_a_second_one(course, monkeypatch):
    """The refresh path. A second plan would also be a second model call."""
    _stub_plan(monkeypatch)
    user_id, course_id, chapters = course

    async def _twice():
        first = await _start(user_id, course_id, chapters["one"], restart=False)
        second = await _start(user_id, course_id, chapters["one"], restart=False)
        return first, second

    first, second = run(_twice())
    assert first is not None and second is not None
    assert first.session_id == second.session_id


# --- restart ----------------------------------------------------------------


def test_restart_archives_the_old_session_and_opens_a_new_one(course, monkeypatch):
    _stub_plan(monkeypatch)
    user_id, course_id, chapters = course
    old_id = run(_finish(chapters["one"]))

    session = run(_start(user_id, course_id, chapters["one"], restart=True))
    assert session is not None
    assert session.session_id != old_id
    assert session.cursor == 0

    rows = run(_session_rows(chapters["one"]))
    by_id = {row["id"]: row for row in rows}
    # Archived, not deleted: the transcript is the record of what was taught.
    assert by_id[old_id]["status"] == "archived"
    assert by_id[session.session_id]["status"] == "active"


def test_restart_is_scoped_to_its_own_lesson(course, monkeypatch):
    """Another lesson's session must not be collateral damage."""
    _stub_plan(monkeypatch)
    user_id, course_id, chapters = course
    other_id = run(_finish(chapters["two"]))

    run(_start(user_id, course_id, chapters["one"], restart=True))

    other = run(_session_rows(chapters["two"]))
    assert [row["id"] for row in other] == [other_id]
    assert other[0]["status"] == "active"


def test_restart_after_the_board_is_finished_leaves_something_to_play(course, monkeypatch):
    """The dead end this feature removes.

    Before: reopening a finished lesson resumed at `cursor == steps`, so the
    timeline got an empty list and played nothing. After a restart there is a
    step 0 again, which is the whole point.
    """
    _stub_plan(monkeypatch)
    user_id, course_id, chapters = course
    run(_finish(chapters["one"]))

    resumed_as_is = run(_start(user_id, course_id, chapters["one"], restart=False))
    assert resumed_as_is is not None
    assert resumed_as_is.cursor >= len(resumed_as_is.steps)  # nothing left to play

    fresh = run(_start(user_id, course_id, chapters["one"], restart=True))
    assert fresh is not None
    assert fresh.cursor < len(fresh.steps)
