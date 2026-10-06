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


# --- 课程中心那一侧（B-01） --------------------------------------------------
#
# `progress_service.get_courses_point_counts` join 的是 `course_points` —— 视频课
# 的表。free 课程没有 point，所以那个查询对它**根本没有行**，调用方按
# 「缺 entry 视为 0/0」处理 ⇒ 自由课程在课程中心永远 0/0、永远落在「进行中」tab。
# 这一节钉的是修好之后的样子。


def test_a_free_course_reports_chapter_progress_to_the_course_center(course):
    """free 课程的两门课：一门学完（cursor 到底）、一门没碰过 ⇒ (1, 2)。"""
    user_id, course_id, chapters = course
    run(_write_session(chapters["full"], cursor=2, steps=2))

    counts = run(_counts(user_id, course_id))
    assert counts[course_id] == (1, 2), (
        "自由课程的中心进度必须按课节算，而且要与课程页同源"
    )


def test_the_center_and_the_course_page_agree_on_what_finished_means(course):
    """⚠️ 同一门课，课程页与课程中心必须给出同一个「学完」。

    两处口径若分叉，课程页会显示「1/2 学完」而课程中心显示「0/2」——
    那比没有进度更糟：用户会以为进度坏了。
    """
    user_id, course_id, chapters = course
    run(_write_session(chapters["full"], cursor=2, steps=2))

    def _finished_pair():
        counts = run(_counts(user_id, course_id))
        page = run(_progress(user_id, course_id))
        return counts[course_id][0], sum(
            1 for lesson in page.values() if lesson.state == "finished"
        )

    assert _finished_pair() == (1, 1)
    # 没碰过的那门课，两侧都算「没学完」—— 口径不同的话这里就会分叉。
    assert run(_counts(user_id, course_id))[course_id] == (1, 2)

    # 那门课还没有内容（夹具里它是 empty），所以它永远不可能学完 ——
    # **这不是**实现的问题，而是「没有内容」在课程页也显示 pending_content。
    page = run(_progress(user_id, course_id))
    # _progress 返回 {title: progress} ⇒ key 才是标题
    assert page["Empty lesson"].state == "pending_content"


def test_a_re_teach_moves_a_finished_lesson_back_to_in_progress(course):
    """⚠️ 「学完」不是一次性能写下的事实。

    这个模块的 docstring 已经为「课节级进度」写过这条；这里是它对**课程中心**
    的同样要求 —— 而课程中心那侧是新增的，最容易在这里被写成"查完就算"。
    """
    user_id, course_id, chapters = course
    run(_write_session(chapters["full"], cursor=2, steps=2))
    assert run(_counts(user_id, course_id))[course_id] == (1, 2)
    # 用户说「我没懂」⇒ plan 追加两步，cursor 停在 2 ⇒ 又变回在学。
    # ⚠️ 必须**再写一条更新的 session**（ 取 created_at desc 的
    # 第一条），而不是给旧的那条改 plan —— 后者测的是改了历史，
    # 那不是重讲发生的事。
    run(_write_session(chapters["full"], cursor=2, steps=4))
    assert run(_counts(user_id, course_id))[course_id] == (0, 2)


def test_the_list_endpoint_carries_mode_and_free_counts(course):
    """线上契约：`mode` 在，且 free 课程的两数不是 0/0。"""
    user_id, course_id, chapters = course
    run(_write_session(chapters["full"], cursor=2, steps=2))

    rows = run(_listed(user_id))
    row = next(r for r in rows if r.id == course_id)
    # 没有 mode 的话前端 `isFree` 恒 false ⇒ 点进去拉一棵空树
    assert row.mode == "free"
    assert (row.completed_point_count, row.total_point_count) == (1, 2)


def test_a_video_course_keeps_its_point_counts(course):
    """视频课那一侧不受影响 —— 修 free 不能改 video 的口径。"""
    user_id, course_id, _chapters = course
    video_id = run(_add_video_course(user_id))
    rows = run(_listed(user_id))
    row = next(r for r in rows if r.id == video_id)
    assert row.mode == "video"
    # 这门课没有 point ⇒ 0/0 是**对的**（它确实一节都没上），而 free 侧的 0/0 是断口
    assert (row.completed_point_count, row.total_point_count) == (0, 0)


async def _counts(user_id: uuid.UUID, course_id: uuid.UUID) -> dict:
    async with AsyncSessionLocal() as db:
        return await free_course_service.course_progress_counts(
            db, course_ids=[course_id]
        )


async def _listed(user_id: uuid.UUID):
    from services import course_service

    async with AsyncSessionLocal() as db:
        return await course_service.list_courses(db, user_id=user_id)


async def _add_video_course(user_id: uuid.UUID) -> uuid.UUID:
    course_id = uuid.uuid4()
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "insert into courses "
                "(id, user_id, topic, title, status, search_status, mode) "
                "values (:id, :user_id, 't', 'video fixture', 'ready', "
                " 'searched', 'video')"
            ),
            {"id": course_id, "user_id": user_id},
        )
    return course_id
