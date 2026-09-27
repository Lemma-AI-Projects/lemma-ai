"""Channel ④ end to end through the SERVICE layer — rows in, a changed structure out.

Why this exists next to `tests/ai/knowledge/test_state.py`: those tests prove
`revise` is correct on hand-made inputs. These prove the pipe around it — that a
structure written as rows, plus evidence written as rows, actually retires an
edge, actually writes the counterexample count back, and actually changes the
derived state the prompt and the panel read. The pure tests cannot catch a
mapping that drops `confidence` (which would make the human-review immunity a
promise nobody keeps) or a read path that forgets to persist.

Two edges, one per confidence, so both halves of rule 2 are exercised against
the same database state without the tests interfering with each other.

Skipped when no database is reachable (same as the other DB-backed modules), so
a checkout without the local Postgres still runs the suite green.
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid

import pytest
from sqlalchemy import text

from core.database import AsyncSessionLocal, engine
from schemas.knowledge import KnowledgeEvidenceIn, KnowledgeImportIn
from services import knowledge_service

# Two independent chains so the drafted-edge test and the confirmed-edge test
# never share an item: a→b is machine-drafted, c→d was confirmed by a person.
DRAFTED = ("矩阵基础", "特征值")
CONFIRMED = ("线性无关", "对角化")


def run(coro):
    """asyncio.run with the pool drained on both sides (see the learner-state test)."""

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
    """A throwaway profile + space holding both two-item chains, torn down after."""

    async def _probe():
        async with engine.connect() as conn:
            await conn.execute(text("select 1"))

    try:
        run(_probe())
    except Exception as exc:  # noqa: BLE001 — any failure means "no database here"
        pytest.skip(f"no database reachable: {type(exc).__name__}: {exc}")

    ids = run(_create_space())
    run(_seed_structure(ids))
    yield ids
    run(_drop_space(ids[0]))


async def _create_space() -> tuple[uuid.UUID, uuid.UUID]:
    user_id, project_id = uuid.uuid4(), uuid.uuid4()
    email = f"structure-revision-test-{user_id}@example.test"
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
                "insert into projects (id, user_id, name) "
                "values (:id, :user_id, :name)"
            ),
            {
                "id": project_id,
                "user_id": user_id,
                "name": "structure-revision-test-space",
            },
        )
    return user_id, project_id


async def _seed_structure(ids) -> None:
    _, project_id = ids
    labels = [*DRAFTED, *CONFIRMED]
    payload = KnowledgeImportIn.model_validate(
        {
            "items": [{"ref": f"i{n}", "label": label} for n, label in enumerate(labels)],
            "edges": [
                {"from": "i0", "to": "i1", "confidence": "agent_drafted"},
                {"from": "i2", "to": "i3", "confidence": "user_confirmed"},
            ],
        }
    )
    async with AsyncSessionLocal() as db:
        await knowledge_service.import_structure(
            db, project_id=project_id, payload=payload
        )


async def _drop_space(user_id: uuid.UUID) -> None:
    async with engine.begin() as conn:
        await conn.execute(
            text("delete from auth.users where id = :id"), {"id": user_id}
        )


def _record(user_id, project_id, label: str, verdict: str) -> None:
    async def _write():
        async with AsyncSessionLocal() as db:
            await knowledge_service.record_evidence(
                db,
                project_id=project_id,
                user_id=user_id,
                payload=KnowledgeEvidenceIn(
                    project_id=project_id,
                    item_label=label,
                    verdict=verdict,
                    tier="A",
                    reasoning="test fixture: the check the verdict came from",
                ),
            )

    run(_write())


def _observe(user_id, project_id) -> dict:
    """One read of everything the page and the prompt would see."""

    async def _read():
        async with AsyncSessionLocal() as db:
            state, _, items, edges = await knowledge_service.compute_state(
                db, project_id=project_id, user_id=user_id
            )
        return state, items, edges

    state, items, edges = run(_read())
    labels = {str(row.id): row.label for row in items}
    return {
        "values": {labels[i]: s.value.value for i, s in state.statuses.items()},
        "overridden": sorted(labels[i] for i in state.overridden_ids),
        "counts": {
            f"{labels[str(e.from_item_id)]}→{labels[str(e.to_item_id)]}": e.counterexample_count
            for e in edges
        },
        "edge_rows": len(edges),
    }


def test_two_counterexamples_retire_a_drafted_edge_and_the_state_follows(space):
    user_id, project_id = space
    key = f"{DRAFTED[0]}→{DRAFTED[1]}"

    # --- one counterexample: the dependent is proven, its prerequisite failed ---
    # The edge is what made the failure above spread down; with one record the
    # count is below the threshold, so the structure is untouched and "negative
    # wins" still pulls the dependent back.
    _record(user_id, project_id, DRAFTED[1], "correct")
    _record(user_id, project_id, DRAFTED[0], "incorrect")
    seen = _observe(user_id, project_id)
    assert seen["counts"][key] == 1
    assert seen["edge_rows"] == 2  # nothing deleted, ever
    assert seen["values"][DRAFTED[1]] == "not_mastered"
    assert seen["overridden"] == [DRAFTED[1]]

    # --- the second independent success: threshold reached, edge retires -------
    _record(user_id, project_id, DRAFTED[1], "correct")
    seen = _observe(user_id, project_id)
    assert seen["counts"][key] == 2  # the count is what got written back
    assert seen["edge_rows"] == 2  # the row is still there: retirement is derived
    assert seen["values"][DRAFTED[1]] == "mastered"  # the state followed
    assert seen["overridden"] == []

    # --- reading again changes nothing (idempotence, through the service) ------
    again = _observe(user_id, project_id)
    assert again["counts"] == seen["counts"]
    assert again["values"] == seen["values"]


def test_a_person_confirmed_edge_counts_counterexamples_but_survives(space):
    user_id, project_id = space
    key = f"{CONFIRMED[0]}→{CONFIRMED[1]}"

    _record(user_id, project_id, CONFIRMED[1], "correct")
    _record(user_id, project_id, CONFIRMED[1], "correct")
    _record(user_id, project_id, CONFIRMED[0], "incorrect")

    seen = _observe(user_id, project_id)
    assert seen["counts"][key] == 2  # the disagreement is recorded…
    assert seen["values"][CONFIRMED[1]] == "not_mastered"  # …and still outranked
    assert seen["overridden"] == [CONFIRMED[1]]
