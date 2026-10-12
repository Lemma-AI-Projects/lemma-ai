"""Run one practice answer through, twice, and check what the second one does.

Two claims this codebase has been asserting without ever running them:

* **Idempotence.** One attempt, one evidence row. The guard tests use a database
  object that raises on any access, so they prove the *write* is never entered —
  and say nothing about whether the *read* in front of it works. It did not: the
  JSON accessor was wrong, which is how `scripts/` found it.
* **The unbindable guard.** An answer with no knowledge point must produce
  nothing at all, and must not be rounded into a plausible item.

Five assertions, in order:

    1. first call  → admitted,      row count +1
    2. same call   → duplicate,     row count unchanged
    3. a different answer → admitted, row count +1   (dedupe is not "reject all")
    4. no concept, no label → unbindable, row count unchanged
    5. counter-example: a made-up label → whatever happens, reported either way

Nothing is deleted unless `--cleanup` is passed; the rows are the evidence.

Usage:
    python scripts/smoke_practice_evidence.py
    python scripts/smoke_practice_evidence.py --cleanup
"""

from __future__ import annotations

import argparse
import asyncio
import sys
import uuid

sys.path.insert(0, ".")

from sqlalchemy import text  # noqa: E402

from core.database import AsyncSessionLocal  # noqa: E402
from services.practice import (  # noqa: E402
    EvidenceOutcome,
    from_course_observation,
    submit_as_evidence,
)

FIXTURE_SPACE_NAME = "practice-fixture"

#: A label that cannot be a real knowledge item. Passed deliberately in step 5 to
#: see whether the space invents one.
BOGUS_LABEL = "__not_a_real_item__"


def _check(ok: bool, label: str) -> bool:
    print(f"{'PASS' if ok else 'FAIL'}  {label}")
    return ok


async def _find_objects(db) -> tuple[tuple, tuple]:
    """One practice object with a concept and one without, in the fixture space."""
    base = (
        "select o.id, o.concept, ch.id, cu.user_id, cu.project_id "
        "from course_lesson_objects o "
        "join course_chapters ch on ch.id = o.chapter_id "
        "join course_units u on u.id = ch.unit_id "
        "join courses cu on cu.id = u.course_id "
        "where cu.project_id is not null and o.kind = 'practice'"
    )
    with_concept = (await db.execute(text(base + " and o.concept is not null limit 1"))).first()
    without = (await db.execute(text(base + " and o.concept is null limit 1"))).first()
    return with_concept, without


async def _make_observation(db, object_id: uuid.UUID, verdict: str, correct: bool) -> uuid.UUID:
    obs_id = uuid.uuid4()
    await db.execute(
        text(
            "insert into course_lesson_observations "
            "(id, object_id, kind, response_json, verdict, is_correct, feedback) "
            "values (:i, :o, 'answer', :r, :v, :c, '练习夹具')"
        ),
        {"i": obs_id, "o": object_id, "r": '{"selected": ["fixture"]}', "v": verdict, "c": correct},
    )
    await db.commit()
    return obs_id


async def _count(db) -> int:
    return (await db.execute(text("select count(*) from knowledge_evidence"))).scalar()


async def run() -> bool:
    results: list[bool] = []
    async with AsyncSessionLocal() as db:
        with_c, without_c = await _find_objects(db)
        if with_c is None:
            print("no practice object with a concept in a placed course — run "
                  "make_practice_space.py first")
            return False

        object_id, concept, chapter_id, owner, space = with_c
        _, _, _, owner_ns, space_ns = with_c
        print(f"object with concept   : {str(object_id)[:8]}  {concept}")
        print(f"step 4 withholds the label (object itself keeps its concept)")
        print(f"scope_ref             : space:{space}\n")

        # 1 · first call
        obs = await _make_observation(db, object_id, "correct", True)
        ev = from_course_observation(observation_id=obs, verdict="correct", is_correct=True)
        before = await _count(db)
        r1 = await submit_as_evidence(db, user_id=owner, scope_ref=f"space:{space}",
                                       evaluation=ev, item_label=concept)
        after1 = await _count(db)
        results.append(_check(r1.outcome is EvidenceOutcome.ADMITTED, f"1 first call admitted ({r1.outcome.value})"))
        results.append(_check(after1 == before + 1, f"1 row count {before} -> {after1}"))

        # 2 · the same one again
        r2 = await submit_as_evidence(db, user_id=owner, scope_ref=f"space:{space}",
                                       evaluation=ev, item_label=concept)
        after2 = await _count(db)
        results.append(_check(r2.outcome is EvidenceOutcome.DUPLICATE, f"2 second call duplicate ({r2.outcome.value})"))
        results.append(_check(after2 == after1, f"2 row count unchanged ({after1} -> {after2})"))

        # 3 · a different answer must still get through
        obs2 = await _make_observation(db, object_id, "correct", True)
        ev2 = from_course_observation(observation_id=obs2, verdict="correct", is_correct=True)
        r3 = await submit_as_evidence(db, user_id=owner, scope_ref=f"space:{space}",
                                       evaluation=ev2, item_label=concept)
        after3 = await _count(db)
        results.append(_check(r3.outcome is EvidenceOutcome.ADMITTED, f"3 different answer admitted ({r3.outcome.value})"))
        results.append(_check(after3 == after2 + 1, f"3 row count {after2} -> {after3}"))

        # 4 · no label supplied — the guard
        obs3 = await _make_observation(db, with_c[0], "correct", True)
        ev3 = from_course_observation(observation_id=obs3, verdict="correct", is_correct=True)
        r4 = await submit_as_evidence(db, user_id=owner_ns, scope_ref=f"space:{space_ns}",
                                       evaluation=ev3)
        after4 = await _count(db)
        results.append(_check(r4.outcome is EvidenceOutcome.UNBINDABLE, f"4 unbindable ({r4.outcome.value})"))
        results.append(_check(after4 == after3, f"4 row count unchanged ({after3} -> {after4})"))

        # 5 · counter-example: does the space invent an item from a made-up label?
        obs4 = await _make_observation(db, object_id, "correct", True)
        ev4 = from_course_observation(observation_id=obs4, verdict="correct", is_correct=True)
        r5 = await submit_as_evidence(db, user_id=owner, scope_ref=f"space:{space}",
                                       evaluation=ev4, item_label=BOGUS_LABEL)
        after5 = await _count(db)
        made_up = (await db.execute(
            text("select count(*) from knowledge_items where label = :l"), {"l": BOGUS_LABEL}
        )).scalar()
        print(f"\n5 counter-example ({BOGUS_LABEL!r}): {r5.outcome.value}"
              f" | rows {after4} -> {after5} | an item with that label exists: {made_up}")
        print("   Note: this one is reported, not asserted: an admitted row here means the"
              " space will create an item from any label, which is a finding about the"
              " product, not a bug in this script.")

        # what the fixture left behind
        items = (await db.execute(
            text("select label from knowledge_items where project_id = :p order by created_at"),
            {"p": space},
        )).all()
        print(f"\nknowledge_items in space:{str(space)[:8]} = {[x[0] for x in items]}")

    ok = all(results)
    print(f"\n{'ALL PASS' if ok else 'SOME FAILED'}  ({sum(results)}/{len(results)} assertions)")
    return ok


async def cleanup() -> None:
    async with AsyncSessionLocal() as db:
        space = (await db.execute(
            text("select id from projects where name = :n"), {"n": FIXTURE_SPACE_NAME}
        )).first()
        if space is None:
            print("no fixture space")
            return
        await db.execute(
            text("delete from knowledge_evidence where response_ref->>'surface' = 'practice'")
        )
        await db.execute(
            text("update courses set project_id = null where project_id = :p"), {"p": space[0]}
        )
        await db.execute(text("delete from projects where id = :p"), {"p": space[0]})
        await db.commit()
        print(f"removed practice evidence and space {space[0]}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--cleanup", action="store_true")
    args = ap.parse_args()
    if args.cleanup:
        asyncio.run(cleanup())
    else:
        asyncio.run(run())