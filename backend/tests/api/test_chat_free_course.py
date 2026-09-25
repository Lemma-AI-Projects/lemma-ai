"""One sentence in, one course out — the free-course tool turn.

What is pinned here is the **wiring**, not the model. A turn asked for with
`tool="free_course"` has to:

  1. create a free-course shell whose title is the learner's own sentence
     (the card reads its build intent from `course.title`);
  2. create it **before** the intro is generated — that ordering is what makes
     closing the tab mid-intro recoverable;
  3. stream a short intro and then attach exactly one `tool` chunk naming that
     course, so the card appears in the transcript;
  4. persist the turn with the same tool ref, so a reload re-renders the card
     instead of a bare sentence.

The intro itself is stubbed: the model is not the thing under test, and the
free-course pipeline (five phases + questionnaire) is driven by the card, not by
this turn — which is exactly what test 2 asserts (no questionnaire generator, no
broad search: only the shell and the card).

Skips when Postgres is unreachable; needs `alembic upgrade head`.
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime

import pytest
from sqlalchemy import text

from ai import AIChunk, ChatMessage
from core.database import AsyncSessionLocal, engine
from core.security import CurrentUser
from schemas.ai import ChatRequest
from services import chat_service, conversation_service

SENTENCE = "我想学习 PDE"


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
    async def _probe():
        async with engine.connect() as conn:
            await conn.execute(text("select 1"))

    try:
        run(_probe())
    except Exception as exc:  # noqa: BLE001 — any failure means "no database here"
        pytest.skip(f"no database reachable: {type(exc).__name__}: {exc}")

    user_id = run(_create_user())
    yield CurrentUser(id=user_id, email=None)
    run(_drop_user(user_id))


async def _create_user() -> uuid.UUID:
    user_id = uuid.uuid4()
    email = f"free-course-turn-{user_id}@example.test"
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


async def _course_row(course_id: uuid.UUID) -> dict | None:
    async with engine.connect() as conn:
        row = (
            await conn.execute(
                text(
                    "select mode, status, title, topic, search_status, conversation_id "
                    "from courses where id = :id"
                ),
                {"id": course_id},
            )
        ).mappings().first()
    return dict(row) if row else None


async def _last_tool_json(conversation_id: uuid.UUID) -> dict | None:
    async with engine.connect() as conn:
        return (
            await conn.execute(
                text(
                    "select tool_json from ai_messages "
                    "where conversation_id = :id and tool_json is not null "
                    "order by created_at desc limit 1"
                ),
                {"id": conversation_id},
            )
        ).scalar_one_or_none()


def _stub_intro(monkeypatch, *, user_id=None, observe_course_id: list | None = None):
    """A fake intro stream: one delta, then done.

    `observe_course_id` lets a test look at the database *while* the intro is
    streaming — the only way to prove the shell is created before the first
    model call rather than after the turn finishes. Counted per user, so other
    tests' orphan shells cannot make it pass or fail.
    """

    async def fake_stream(*args, **kwargs) -> AsyncIterator[AIChunk]:
        if observe_course_id is not None:
            async with engine.connect() as conn:
                observe_course_id.append(
                    (
                        await conn.execute(
                            text(
                                "select count(*) from courses "
                                "where mode = 'free' and user_id = :uid"
                            ),
                            {"uid": user_id},
                        )
                    ).scalar_one()
                )
        yield AIChunk(kind="delta", text="我来给你排一门课。")
        yield AIChunk(kind="done", raw_parts={"stub": True})

    monkeypatch.setattr(chat_service.ai_client, "stream_chat", fake_stream)


# --- the turn ---------------------------------------------------------------


def test_a_free_course_turn_creates_the_shell_and_attaches_the_card(user, monkeypatch):
    observed: list[int] = []
    _stub_intro(monkeypatch, user_id=user.id, observe_course_id=observed)

    async def _turn():
        async with AsyncSessionLocal() as db:
            context = await chat_service.prepare_turn(
                db,
                ChatRequest(tool="free_course", messages=[{"role": "user", "content": SENTENCE}]),
                user,
            )
            assert context is not None
            chunks = [chunk async for chunk in chat_service.run_turn(context, tool="free_course", user=user)]
            return context, chunks

    context, chunks = run(_turn())

    tool_chunks = [chunk for chunk in chunks if chunk.kind == "tool"]
    assert len(tool_chunks) == 1
    assert tool_chunks[0].tool["type"] == "free_course"
    course_id = uuid.UUID(tool_chunks[0].tool["courseId"])
    # The card is attached before the turn is done — the transcript order the UI
    # depends on.
    assert chunks[-1].kind == "done"

    # 1. the shell exists, titled with the learner's own sentence …
    course = run(_course_row(course_id))
    assert course is not None
    assert course["mode"] == "free"
    assert course["status"] == "materializing"  # building, and hidden from lists
    assert course["title"] == SENTENCE
    assert course["topic"] == SENTENCE
    # … and it skipped the video pipeline's search sub-state, because a free
    # course is generated from the sentence, not selected from a candidate pool.
    assert course["search_status"] == "searched"

    # 2. the shell existed BEFORE the intro was generated (the recoverability
    #    guarantee: a tab closed mid-intro still leaves a course to come back to).
    assert observed == [1]

    # 3. the turn persisted the same ref, so a reload re-renders the card.
    stored = run(_last_tool_json(context.conversation_id))
    assert stored == {"type": "free_course", "courseId": str(course_id)}


def test_the_shell_is_created_without_joining_a_conversation_that_does_not_exist_yet(
    user, monkeypatch
):
    """A brand-new conversation has no row yet, so the course cannot point at it
    (that would violate the FK before persist). It links through the turn's
    tool_json instead — and the turn still lands."""
    _stub_intro(monkeypatch)

    async def _turn():
        async with AsyncSessionLocal() as db:
            context = await chat_service.prepare_turn(
                db,
                ChatRequest(tool="free_course", messages=[{"role": "user", "content": SENTENCE}]),
                user,
            )
            assert context is not None
            assert context.new_conversation_title  # i.e. "new", not existing
            chunks = [chunk async for chunk in chat_service.run_turn(context, tool="free_course", user=user)]
            return context, chunks

    context, chunks = run(_turn())
    course_id = uuid.UUID(
        next(chunk for chunk in chunks if chunk.kind == "tool").tool["courseId"]
    )
    course = run(_course_row(course_id))
    assert course is not None
    assert course["conversation_id"] is None

    async def _conversation():
        async with AsyncSessionLocal() as db:
            return await conversation_service.get_owned_conversation(
                db, user_id=user.id, conversation_id=context.conversation_id
            )

    assert run(_conversation()) is not None


def test_a_failed_intro_attaches_no_card(user, monkeypatch):
    """The intro is the only thing that can fail here. When it does, the turn
    stops without a tool chunk (nothing to render) — the orphan shell is left for
    the sweeper, exactly like the video course-planning turn."""

    async def fake_stream(*args, **kwargs) -> AsyncIterator[AIChunk]:
        yield AIChunk(kind="error", error_message="boom")

    monkeypatch.setattr(chat_service.ai_client, "stream_chat", fake_stream)

    async def _turn():
        async with AsyncSessionLocal() as db:
            context = await chat_service.prepare_turn(
                db,
                ChatRequest(tool="free_course", messages=[{"role": "user", "content": SENTENCE}]),
                user,
            )
            assert context is not None
            chunks = [chunk async for chunk in chat_service.run_turn(context, tool="free_course", user=user)]
            return context, chunks

    context, chunks = run(_turn())
    assert [chunk.kind for chunk in chunks] == ["error"]

    async def _conversation():
        async with AsyncSessionLocal() as db:
            return await conversation_service.get_owned_conversation(
                db, user_id=user.id, conversation_id=context.conversation_id
            )

    # No turn was persisted: a failed intro leaves nothing in the transcript.
    assert run(_conversation()) is None


def test_other_tools_are_untouched(user, monkeypatch):
    """`None` and the video tool must not fall into the free-course turn."""
    _stub_intro(monkeypatch)

    async def _turn(tool):
        async with AsyncSessionLocal() as db:
            context = await chat_service.prepare_turn(
                db,
                ChatRequest(tool=tool, messages=[{"role": "user", "content": SENTENCE}]),
                user,
            )
            assert context is not None
            generator = chat_service.run_turn(context, tool=tool, user=user)
            assert generator.ag_code is not chat_service.stream_free_course_turn.__code__
            with contextlib.suppress(Exception):
                await generator.aclose()
            return True

    assert run(_turn(None)) is True
    assert run(_turn("course_planning")) is True


def test_the_sentence_is_the_only_thing_that_reaches_the_model_history(user, monkeypatch):
    """The intro sees the learner's sentence as the last user message (and no
    invented topic): the free-course prompt is the plain course-plan intro."""
    seen: list[list[ChatMessage]] = []

    async def fake_stream(use_case, messages, **kwargs) -> AsyncIterator[AIChunk]:
        seen.append(list(messages))
        yield AIChunk(kind="delta", text="好。")
        yield AIChunk(kind="done", raw_parts={"stub": True})

    monkeypatch.setattr(chat_service.ai_client, "stream_chat", fake_stream)

    async def _turn():
        async with AsyncSessionLocal() as db:
            context = await chat_service.prepare_turn(
                db,
                ChatRequest(tool="free_course", messages=[{"role": "user", "content": SENTENCE}]),
                user,
            )
            assert context is not None
            async for _chunk in chat_service.run_turn(context, tool="free_course", user=user):
                pass

    run(_turn())
    assert len(seen) == 1
    assert [message.content for message in seen[0]] == [SENTENCE]
