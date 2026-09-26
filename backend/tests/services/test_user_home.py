"""User Home: the global layer, and the three scopes it must not blur.

These are the five behaviours the feature is defined by, each one written
against a real database and the real context assembly — because every one of
them is a statement about *where a fact lives*, and a stubbed assembly cannot
disagree with a stub in a way that means anything.

  Test 1 — Home is global: written once, read from Space A and from Space B.
  Test 2 — a space preference stays in its space, and Home is not touched.
  Test 3 — a conversation overrides space and Home for that turn, and Home is
           still unchanged afterwards.
  Test 4 — nothing writes Home silently: a proposal is invisible to the prompt,
           and a turn that only talks changes nothing.
  Test 5 — an explicit statement, once confirmed, becomes Home and is visible
           from another space.

Each test gets its own learner, spaces and conversation, so no test can pass or
fail because of what another one left behind. The module skips when Postgres is
unreachable, the same way the other `*_db` tests do; teardown deletes the auth
user and everything cascades from there.
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid

import pytest
from sqlalchemy import text

from core.database import AsyncSessionLocal, engine
from services import (
    agent_context_service,
    space_preference_service,
    user_home_service,
)

LANGUAGE = "zh"
BACKGROUND = "本科·计算机"
INTEREST = "AI"
PREFERENCE = "回答尽量简洁"
SPACE_A_PREFERENCE = "这个空间里讲详细一点"
#: The sentence a person says when they mean it as a lasting habit — the only
#: kind of statement that may become a proposal.
LASTING_REQUEST = "以后都尽量简洁一点"


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


@pytest.fixture
def spaces():
    """(user_id, space_a, space_b, conversation_id) for a throwaway learner."""

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


async def _create() -> tuple[uuid.UUID, uuid.UUID, uuid.UUID, uuid.UUID]:
    user_id = uuid.uuid4()
    space_a, space_b, conversation_id = (uuid.uuid4() for _ in range(3))
    email = f"user-home-test-{user_id}@example.test"
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
        for project_id, name in ((space_a, "home-test-A"), (space_b, "home-test-B")):
            await conn.execute(
                text("insert into projects (id, user_id, name) values (:id, :u, :n)"),
                {"id": project_id, "u": user_id, "n": name},
            )
        # The conversation carries a method, which is the only conversation-scoped
        # preference the product stores today.
        await conn.execute(
            text(
                "insert into ai_conversations (id, user_id, project_id, method) "
                "values (:id, :u, :p, :m)"
            ),
            {"id": conversation_id, "u": user_id, "p": space_a, "m": "socratic"},
        )
    return user_id, space_a, space_b, conversation_id


async def _drop(user_id: uuid.UUID) -> None:
    async with engine.begin() as conn:
        await conn.execute(text("delete from auth.users where id = :id"), {"id": user_id})


async def _seed_home(user_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        await user_home_service.update_about(
            db, user_id=user_id, language=LANGUAGE, background=BACKGROUND
        )
        await user_home_service.add_item(
            db, user_id=user_id, kind="interest", text=INTEREST
        )
        await user_home_service.add_item(
            db, user_id=user_id, kind="preference", text=PREFERENCE
        )


async def _context(user_id: uuid.UUID, project_id: uuid.UUID, conversation_id=None):
    """What the Global Agent is actually given in that space."""
    async with AsyncSessionLocal() as db:
        context = await agent_context_service.build_agent_context(
            db,
            user_id=user_id,
            project_id=project_id,
            current_conversation_id=conversation_id,
        )
    assert context is not None, "the space belongs to this user"
    return context


async def _home(user_id: uuid.UUID):
    async with AsyncSessionLocal() as db:
        return await user_home_service.read_user_home(db, user_id=user_id)


async def _propose(user_id: uuid.UUID, *, text_: str, space_id, conversation_id):
    async with AsyncSessionLocal() as db:
        return await user_home_service.add_item(
            db,
            user_id=user_id,
            kind="preference",
            text=text_,
            # What the agent's tool writes: a proposal, never a fact.
            status="candidate",
            origin="agent",
            conversation_id=conversation_id,
            project_id=space_id,
        )


# --- Test 1: Home is global -------------------------------------------------


def test_home_written_once_is_read_from_every_space(spaces):
    user_id, space_a, space_b, _conversation = spaces
    run(_seed_home(user_id))

    prompt_a = run(_context(user_id, space_a)).prompt_block
    context_b = run(_context(user_id, space_b))
    prompt_b = context_b.prompt_block

    for prompt in (prompt_a, prompt_b):
        assert "About this learner — their Home" in prompt
        assert LANGUAGE in prompt
        assert INTEREST in prompt
        assert PREFERENCE in prompt
        # The block has to SAY it is global: a model that reads these lines inside
        # one space will otherwise assume they belong to that space.
        assert "GLOBAL" in prompt

    # The machine-readable half agrees, which is what the Context panel shows.
    assert context_b.home_summary == {
        "global": True,
        "language": LANGUAGE,
        "background": BACKGROUND,
        "interests": [INTEREST],
        "preferences": [PREFERENCE],
        "candidates": 0,
    }


# --- Test 2: a space preference stays in its space --------------------------


def test_a_space_preference_does_not_leak_to_another_space_or_home(spaces):
    user_id, space_a, space_b, _conversation = spaces
    run(_seed_home(user_id))

    async def _set():
        async with AsyncSessionLocal() as db:
            return await space_preference_service.set_preference(
                db, user_id=user_id, project_id=space_a, text=SPACE_A_PREFERENCE
            )

    assert run(_set()) is not None

    assert SPACE_A_PREFERENCE in run(_context(user_id, space_a)).prompt_block
    assert SPACE_A_PREFERENCE not in run(_context(user_id, space_b)).prompt_block

    # Home must be untouched by a space-level setting — that is the whole reason
    # space preferences get their own table instead of a scope column on Home.
    home = run(_home(user_id))
    assert home.preferences == [PREFERENCE]
    assert SPACE_A_PREFERENCE not in home.preferences

    async def _rows():
        async with AsyncSessionLocal() as db:
            return await space_preference_service.list_for_space(
                db, user_id=user_id, project_id=space_a
            )

    assert [row.text for row in run(_rows())] == [SPACE_A_PREFERENCE]


# --- Test 3: a conversation overrides both, and changes neither -------------


def test_conversation_layer_outranks_space_and_home_without_editing_home(spaces):
    user_id, space_a, _space_b, conversation_id = spaces
    run(_seed_home(user_id))

    async def _set():
        async with AsyncSessionLocal() as db:
            await space_preference_service.set_preference(
                db, user_id=user_id, project_id=space_a, text=SPACE_A_PREFERENCE
            )

    run(_set())

    async def _layers():
        async with AsyncSessionLocal() as db:
            home = await user_home_service.read_user_home(db, user_id=user_id)
            rows = await space_preference_service.list_for_space(
                db, user_id=user_id, project_id=space_a
            )
            return user_home_service.preference_layers(
                home=home.preferences,
                space=[row.text for row in rows],
                conversation=await user_home_service.conversation_note(
                    db, conversation_id=conversation_id
                ),
            )

    layers = run(_layers())
    assert [layer.scope for layer in layers] == ["conversation", "space", "home"]
    assert layers[0].text == "socratic"

    context = run(_context(user_id, space_a, conversation_id))
    # The stack is stated in the prompt, in that order, so the model does not have
    # to guess which line wins when they disagree.
    assert "most specific first" in context.prompt_block
    assert context.prompt_block.index("THIS turn") < context.prompt_block.index(
        "THIS space"
    )
    assert [layer["scope"] for layer in context.preference_layers] == [
        "conversation",
        "space",
        "home",
    ]

    # Read-only, all of it: the turn left Home exactly as it found it.
    assert run(_home(user_id)).preferences == [PREFERENCE]


# --- Test 4: nothing writes Home silently ----------------------------------


def test_a_proposal_and_a_one_off_request_change_no_shared_fact(spaces):
    user_id, space_a, _space_b, conversation_id = spaces

    async def _counts():
        async with AsyncSessionLocal() as db:
            confirmed = await user_home_service.list_items(db, user_id=user_id)
            candidates = await user_home_service.list_candidates(db, user_id=user_id)
            return len(confirmed), len(candidates)

    before = run(_counts())
    assert before == (0, 0)

    # A proposal — what the agent's tool writes — lands as a candidate…
    item, created = run(
        _propose(
            user_id, text_=LASTING_REQUEST, space_id=space_a, conversation_id=conversation_id
        )
    )
    assert created is True
    assert item.status == "candidate"
    assert item.confirmed_at is None
    assert item.origin == "agent"

    # …and is invisible where it matters: the prompt, and the confirmed lists.
    # (A one-off request needs no row at all — it is only a message, which is why
    # "nothing changed" is the honest assertion here.)
    assert LASTING_REQUEST not in run(_context(user_id, space_a)).prompt_block
    assert run(_counts()) == (0, 1)

    # The same proposal twice does not stack up for the user to dismiss twice.
    _again, created_again = run(
        _propose(
            user_id, text_=LASTING_REQUEST, space_id=space_a, conversation_id=conversation_id
        )
    )
    assert created_again is False
    assert run(_counts()) == (0, 1)


# --- Test 5: an explicit statement becomes Home after confirmation -----------


def test_confirmation_is_the_moment_a_proposal_becomes_home(spaces):
    user_id, space_a, space_b, conversation_id = spaces
    run(_seed_home(user_id))
    run(
        _propose(
            user_id, text_=LASTING_REQUEST, space_id=space_a, conversation_id=conversation_id
        )
    )

    async def _confirm():
        async with AsyncSessionLocal() as db:
            candidates = await user_home_service.list_candidates(db, user_id=user_id)
            target = next(row for row in candidates if row.text == LASTING_REQUEST)
            return await user_home_service.update_item(
                db, user_id=user_id, item_id=target.id, status="confirmed"
            )

    confirmed = run(_confirm())
    assert confirmed is not None
    assert confirmed.confirmed_at is not None
    # Provenance survives confirmation: "the agent suggested this and I agreed"
    # must stay visible instead of being laundered into something the user typed.
    assert confirmed.origin == "agent"

    # Visible from the OTHER space — that is the point of the layer.
    prompt_b = run(_context(user_id, space_b)).prompt_block
    assert LASTING_REQUEST in prompt_b
    assert PREFERENCE in prompt_b

    home = run(_home(user_id))
    assert home.preferences == [PREFERENCE, LASTING_REQUEST]
    # Once confirmed it stops being a question.
    assert home.candidates == []


# --- The layer ordering itself, without a database --------------------------


def test_preference_layers_only_lists_what_exists_and_most_specific_first():
    assert user_home_service.preference_layers(home=[], space=[]) == []
    assert [layer.scope for layer in user_home_service.preference_layers(
        home=[PREFERENCE], space=[], conversation=None
    )] == ["home"]
    assert [layer.scope for layer in user_home_service.preference_layers(
        home=[PREFERENCE],
        space=[SPACE_A_PREFERENCE],
        conversation="for this question, step by step",
    )] == ["conversation", "space", "home"]
    # Blank lines are not layers.
    assert user_home_service.preference_layers(home=["  "], space=[]) == []
