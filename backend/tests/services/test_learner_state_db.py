"""Learner State end to end through the SERVICE layer — the A→B→C progression.

Why this exists next to tests/ai/knowledge/test_state.py: those tests prove the
derivation is correct on hand-made inputs. These prove the pipe around it —
that a structure written to the database, plus evidence written to the
database, produces the state and the fringes the prompt and the panel will
show. The pure tests cannot catch a wrong column, a wrong join, or a mapping
that quietly drops the `active` flag.

The progression lives in ONE test on purpose: it is an ordered story (each step
depends on the one before), and splitting it into six ordered tests would make
correctness depend on collection order.

Skipped when no database is reachable (same as the other DB-backed module), so a
checkout without the local Postgres still runs the suite green.
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

# 矩阵基础 → 线性无关 → 特征值 → 特征向量 → 对角化
CHAIN = ["矩阵基础", "线性无关", "特征值", "特征向量", "对角化"]


def run(coro):
    """asyncio.run with the pool drained on both sides (see the memory DB test)."""

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
    """A throwaway profile + space holding the 5-item chain, torn down after."""

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
    email = f"learner-state-test-{user_id}@example.test"
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
            {"id": project_id, "user_id": user_id, "name": "learner-state-test-space"},
        )
    return user_id, project_id


async def _seed_structure(ids) -> None:
    _, project_id = ids
    payload = KnowledgeImportIn.model_validate(
        {
            "items": [{"ref": f"i{n}", "label": label} for n, label in enumerate(CHAIN)],
            "edges": [
                {"from": f"i{n}", "to": f"i{n + 1}"} for n in range(len(CHAIN) - 1)
            ],
        }
    )
    async with AsyncSessionLocal() as db:
        await knowledge_service.import_structure(
            db, project_id=project_id, payload=payload
        )


async def _drop_space(user_id: uuid.UUID) -> None:
    async with engine.begin() as conn:
        await conn.execute(text("delete from auth.users where id = :id"), {"id": user_id})


def _record(user_id, project_id, label: str, verdict: str, tier: str = "A") -> None:
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
                    tier=tier,
                    reasoning="test fixture: the check the verdict came from",
                ),
            )

    run(_write())


def _derive(user_id, project_id):
    async def _read():
        async with AsyncSessionLocal() as db:
            block, ready = await knowledge_service.state_for_prompt(
                db, project_id=project_id, user_id=user_id
            )
            state, fringes, items, _ = await knowledge_service.compute_state(
                db, project_id=project_id, user_id=user_id
            )
        labels = {str(row.id): row.label for row in items}
        return {
            "block": block,
            "ready_from_prompt": ready,
            # Sets, not sorted lists: the labels are Chinese, so string order
            # has nothing to do with the chain order we assert against.
            "mastered": {labels[i] for i in state.mastered_ids},
            "outer": [labels[i] for i in fringes.outer],
            "not_mastered": {labels[i] for i in state.not_mastered_ids},
        }

    return run(_read())


def test_the_state_walks_the_chain(space):
    user_id, project_id = space

    # --- nothing assessed yet: the only way in is the first item ---------------
    derived = _derive(user_id, project_id)
    assert derived["mastered"] == set()
    assert derived["outer"] == [CHAIN[0]]
    # The block and the labels agree — they come from one derivation.
    assert derived["ready_from_prompt"] == derived["outer"]
    assert "学习状态" in derived["block"]
    for label in CHAIN:
        assert label in derived["block"]

    # --- A: one verified correct answer settles it, and B becomes reachable ----
    _record(user_id, project_id, CHAIN[0], "correct")
    derived = _derive(user_id, project_id)
    assert derived["mastered"] == {CHAIN[0]}
    assert derived["outer"] == [CHAIN[1]]

    # --- B ---------------------------------------------------------------
    _record(user_id, project_id, CHAIN[1], "correct")
    derived = _derive(user_id, project_id)
    assert derived["mastered"] == set(CHAIN[:2])
    assert derived["outer"] == [CHAIN[2]]

    # --- C, judged by rubric: ONE correct answer must not settle it ----------
    # A rubric-judged verdict is the weak kind (a model read the answer), so the
    # threshold is two independent records. Note the item stays in the outer
    # fringe throughout: "not settled yet" is not the same as "not reachable".
    _record(user_id, project_id, CHAIN[2], "correct", tier="B")
    derived = _derive(user_id, project_id)
    assert CHAIN[2] not in derived["mastered"]
    assert derived["outer"] == [CHAIN[2]]

    _record(user_id, project_id, CHAIN[2], "correct", tier="B")
    derived = _derive(user_id, project_id)
    assert derived["mastered"] == set(CHAIN[:3])
    assert derived["outer"] == [CHAIN[3]]

    # --- D, answered WRONG: not mastered, and it blocks everything above it ---
    # Upward closure: nothing above a prerequisite you cannot do may be claimed.
    # The failed item itself stays in the outer fringe — that IS the next step,
    # and it is the honest thing to offer after a wrong answer.
    _record(user_id, project_id, CHAIN[3], "incorrect")
    derived = _derive(user_id, project_id)
    assert derived["mastered"] == set(CHAIN[:3])
    assert CHAIN[3] in derived["not_mastered"]
    assert derived["outer"] == [CHAIN[3]]
    assert CHAIN[4] in derived["not_mastered"]

    # --- the prompt block carries the same conclusion ------------------------
    assert "学习状态" in derived["block"]
    assert derived["ready_from_prompt"] == derived["outer"]
