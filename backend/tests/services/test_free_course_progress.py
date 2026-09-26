"""Lesson progress on the course page — derived, against a real database.

Why a real database: the whole feature is the derivation. "Finished" is not a
column anywhere; it is `cursor` compared against the *current* step count, read
in a batch over a course's chapters. A stub would only be able to assert the
stub.

The one claim this module exists to protect: **a lesson that was finished can go
back to in-progress**, because a re-teach appends steps to the plan. Any change
that makes the state sticky (a stored column, a cached digest) breaks that test
and should.

Skips when Postgres is unreachable, so a checkout without the local database
still runs the suite green. Isolation: a throwaway auth user + profile + course
deleted in teardown; the delete cascades.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import uuid

import pytest
from sqlalchemy import text

from core.database import AsyncSessionLocal, engine
from services import free_course_service


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
    """(user_id, course_id, chapters) for a throwaway free course.

    `chapters` is a dict of chapter name -> id, with two lessons in one unit:
    `full` (content: 1 explanation + 2 practice) and `empty` (no content).
    """

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
    full_id, empty_id = uuid.uuid4(), uuid.uuid4()
    email = f"free-course-progress-{user_id}@example.test"
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
                "values (:id, :user_id, :topic, :title, 'ready', 'searched', 'free')"
            ),
            {
                "id": course_id,
                "user_id": user_id,
                "topic": "progress fixture",
                "title": "progress fixture",
            },
        )
        await conn.execute(
            text(
                "insert into course_units "
                "(id, course_id, order_index, title, status) "
                "values (:id, :course_id, 0, :title, 'not_started')"
            ),
            {"id": unit_id, "course_id": course_id, "title": "Unit one"},
        )
        for index, (chapter_id, title) in enumerate(
            ((full_id, "Full lesson"), (empty_id, "Empty lesson"))
        ):
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
                    "title": title,
                },
            )
        # The full lesson: one explanation (read material, NOT practice) and two
        # practice items. The explanation is what makes the counting assertion
        # meaningful — counting every object would report "3".
        objects = [
            (full_id, 0, "explanation", "Read me"),
            (full_id, 1, "practice", "Try 1"),
            (full_id, 2, "practice", "Try 2"),
        ]
        for chapter_id, order_index, kind, title in objects:
            await conn.execute(
                text(
                    "insert into course_lesson_objects "
                    "(id, chapter_id, order_index, kind, title, body, difficulty) "
                    "values (:id, :chapter_id, :index, :kind, :title, 'body', 'core')"
                ),
                {
                    "id": uuid.uuid4(),
                    "chapter_id": chapter_id,
                    "index": order_index,
                    "kind": kind,
                    "title": title,
                },
            )
    return user_id, course_id, {"full": full_id, "empty": empty_id}


async def _drop(user_id: uuid.UUID) -> None:
    async with engine.begin() as conn:
        await conn.execute(
            text("delete from auth.users where id = :id"), {"id": user_id}
        )


async def _write_session(
    chapter_id: uuid.UUID, *, cursor: int, steps: int, age_seconds: int = 0
) -> uuid.UUID:
    """One session row. `age_seconds` orders two rows on the same chapter."""
    session_id = uuid.uuid4()
    plan = {
        "title": "t",
        "objective": "o",
        "steps": [{"id": f"s{i}", "narration": "句。"} for i in range(steps)],
    }
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "insert into free_course_sessions "
                "(id, chapter_id, status, cursor, plan_json, transcript_json, "
                " created_at, updated_at) "
                "values (:id, :chapter_id, 'active', :cursor, cast(:plan as jsonb), "
                " '[]'::jsonb, now() - make_interval(secs => :age), now())"
            ),
            {
                "id": session_id,
                "chapter_id": chapter_id,
                "cursor": cursor,
                "plan": json.dumps(plan),
                "age": age_seconds,
            },
        )
    return session_id


async def _answer(chapter_id: uuid.UUID, *, first_n: int) -> None:
    """Answer the first `first_n` practice items of a chapter."""
    async with engine.begin() as conn:
        object_ids = (
            await conn.execute(
                text(
                    "select id from course_lesson_objects "
                    "where chapter_id = :chapter_id and kind = 'practice' "
                    "order by order_index limit :n"
                ),
                {"chapter_id": chapter_id, "n": first_n},
            )
        ).scalars().all()
        for object_id in object_ids:
            await conn.execute(
                text(
                    "insert into course_lesson_observations "
                    "(id, object_id, kind, verdict, is_correct) "
                    "values (:id, :object_id, 'answer', 'correct', true)"
                ),
                {"id": uuid.uuid4(), "object_id": object_id},
            )


async def _clear_answers(chapter_id: uuid.UUID) -> None:
    """Tests share one course (module fixture), so the answer-counting ones have
    to start from a clean slate rather than from whatever ran before them."""
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "delete from course_lesson_observations where object_id in "
                "(select id from course_lesson_objects where chapter_id = :chapter_id)"
            ),
            {"chapter_id": chapter_id},
        )


async def _progress(user_id: uuid.UUID, course_id: uuid.UUID) -> dict:
    """chapter title -> progress, straight off the detail read."""
    async with AsyncSessionLocal() as db:
        detail = await free_course_service.get_detail(
            db, user_id=user_id, course_id=course_id
        )
    assert detail is not None
    return {
        lesson.title: lesson.progress
        for unit in detail.units
        for lesson in unit.lessons
    }


# --- state ------------------------------------------------------------------


def test_no_content_is_pending_content_not_not_started(course):
    """A lesson with nothing generated is waiting on the generator, not the learner."""
    user_id, course_id, chapters = course
    progress = run(_progress(user_id, course_id))
    assert progress["Empty lesson"].state == "pending_content"
    assert progress["Empty lesson"].practice.answered == 0
    assert progress["Empty lesson"].practice.total == 0


def test_content_but_no_session_is_not_started(course):
    user_id, course_id, _ = course
    progress = run(_progress(user_id, course_id))
    assert progress["Full lesson"].state == "not_started"
    assert progress["Full lesson"].cursor == 0
    assert progress["Full lesson"].steps == 0


def test_cursor_zero_is_still_not_started(course):
    """A session row exists (the page was opened) but nothing played."""
    user_id, course_id, chapters = course
    run(_write_session(chapters["full"], cursor=0, steps=8))
    progress = run(_progress(user_id, course_id))
    assert progress["Full lesson"].state == "not_started"


def test_middle_cursor_is_in_progress_and_reports_position(course):
    user_id, course_id, chapters = course
    run(_write_session(chapters["full"], cursor=3, steps=8))
    progress = run(_progress(user_id, course_id))
    lesson = progress["Full lesson"]
    assert lesson.state == "in_progress"
    assert (lesson.cursor, lesson.steps) == (3, 8)


def test_cursor_at_the_end_is_finished(course):
    user_id, course_id, chapters = course
    run(_write_session(chapters["full"], cursor=8, steps=8))
    progress = run(_progress(user_id, course_id))
    assert progress["Full lesson"].state == "finished"


def test_a_later_retreat_moves_a_finished_lesson_back_to_in_progress(course):
    """The claim this module exists for.

    "Finished" means the board reached the end of the plan *as it stands now*.
    When the learner says 我没懂, the planner appends steps — and the lesson is
    legitimately unfinished again. A stored `finished` flag could not do this.
    """
    user_id, course_id, chapters = course
    run(_write_session(chapters["full"], cursor=8, steps=8))
    assert run(_progress(user_id, course_id))["Full lesson"].state == "finished"

    # Same session, same cursor — the plan simply grew.
    async def _grow():
        async with engine.begin() as conn:
            await conn.execute(
                text(
                    "update free_course_sessions set plan_json = cast(:plan as jsonb) "
                    "where chapter_id = :chapter_id"
                ),
                {
                    "chapter_id": chapters["full"],
                    "plan": json.dumps(
                        {
                            "title": "t",
                            "objective": "o",
                            "steps": [{"id": f"s{i}", "narration": "句。"} for i in range(10)],
                        }
                    ),
                },
            )

    run(_grow())
    lesson = run(_progress(user_id, course_id))["Full lesson"]
    assert lesson.state == "in_progress"
    assert (lesson.cursor, lesson.steps) == (8, 10)


def test_the_newest_session_wins(course):
    """Restarting a lesson archives the old row; the read must follow the newest."""
    user_id, course_id, chapters = course
    run(_write_session(chapters["full"], cursor=8, steps=8, age_seconds=60))
    run(_write_session(chapters["full"], cursor=2, steps=8, age_seconds=0))
    lesson = run(_progress(user_id, course_id))["Full lesson"]
    assert lesson.state == "in_progress"
    assert lesson.cursor == 2


# --- practice ---------------------------------------------------------------


def test_practice_counts_only_answerable_objects(course):
    """The explanation is read material; counting it would overstate the work."""
    user_id, course_id, chapters = course
    run(_clear_answers(chapters["full"]))
    practice = run(_progress(user_id, course_id))["Full lesson"].practice
    assert practice.total == 2


def test_practice_answered_counts_distinct_objects(course):
    user_id, course_id, chapters = course
    run(_clear_answers(chapters["full"]))
    run(_answer(chapters["full"], first_n=1))
    practice = run(_progress(user_id, course_id))["Full lesson"].practice
    assert (practice.answered, practice.total) == (1, 2)


def test_practice_progress_is_independent_of_where_the_board_is(course):
    """Half-taught with no practice done is the normal case, not a contradiction."""
    user_id, course_id, chapters = course
    run(_clear_answers(chapters["full"]))
    run(_write_session(chapters["full"], cursor=3, steps=8))
    lesson = run(_progress(user_id, course_id))["Full lesson"]
    assert lesson.state == "in_progress"
    assert lesson.practice.answered == 0
    assert lesson.practice.total == 2
