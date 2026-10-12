"""Put one course inside a space, so its practice results have somewhere to go.

Evidence needs a scope. `evidence_entry.project_from_scope` takes exactly one
form, `space:<project_id>`, and refuses anything else rather than guessing — a
row written against the wrong space is indistinguishable from a correct one
afterwards. Courses had no space to name, so a practice result from one had no
honest destination: the only way to make the pipeline write anything was to
borrow an unrelated space, which is the thing the practice contract forbids.

**This creates a fixture space rather than pointing at an existing one.** The
three spaces that have knowledge structures are all mathematics, and the practice
objects that carry a concept are systems analysis. Borrowing a maths space would
have produced a green test and a row claiming the learner knows something they
never learned, in a place they were never in — invisible afterwards, which is
what makes it worth a fixture.

**No `knowledge_items` are created here.** `evidence_entry` resolves an
`item_label` against the space and creates the item if it is missing; whether it
actually does is the thing the next batch is here to find out. Creating them here
would answer the question by assuming it.

Usage:
    python scripts/make_practice_space.py                     # create
    python scripts/make_practice_space.py --cleanup           # remove
"""

from __future__ import annotations

import argparse
import asyncio
import sys
import uuid

sys.path.insert(0, ".")

from sqlalchemy import text  # noqa: E402

from core.database import AsyncSessionLocal, engine  # noqa: E402

FIXTURE_SPACE_NAME = "practice-fixture"


async def _target_course(db: AsyncSessionLocal) -> uuid.UUID:
    """The course whose practice objects carry a concept.

    Found by content rather than hard-coded, so the fixture follows the data
    instead of pinning an id that a re-seed would invalidate.
    """
    row = (
        await db.execute(
            text(
                """
                select distinct u.course_id
                from course_lesson_objects o
                join course_chapters ch on ch.id = o.chapter_id
                join course_units u on u.id = ch.unit_id
                join courses cu on cu.id = u.course_id
                where o.concept is not null
                  and o.kind in ('practice', 'assessment')
                  and cu.project_id is null
                limit 1
                """
            )
        )
    ).first()
    if row is None:
        raise SystemExit(
            "no course with a practice concept and no space — nothing to place"
        )
    return row[0]


async def create() -> None:
    async with AsyncSessionLocal() as db:
        existing = (
            await db.execute(
                text("select id from projects where name = :n"),
                {"n": FIXTURE_SPACE_NAME},
            )
        ).first()
        if existing:
            print(f"fixture space already exists: {existing[0]}")
            space_id = existing[0]
        else:
            space_id = uuid.uuid4()
            await db.execute(
                text(
                    "insert into projects (id, user_id, name) "
                    "select :i, user_id, :n from courses "
                    "where id = (select id from courses limit 1)"
                ),
                {"i": space_id, "n": FIXTURE_SPACE_NAME},
            )
            await db.commit()
            print(f"created space: {space_id}")

        course_id = await _target_course(db)
        owner = (
            await db.execute(
                text("select user_id from courses where id = :c"), {"c": course_id}
            )
        ).scalar()

        await db.execute(
            text("update courses set project_id = :p where id = :c"),
            {"p": space_id, "c": course_id},
        )
        await db.commit()

        check = (
            await db.execute(
                text("select project_id from courses where id = :c"), {"c": course_id}
            )
        ).scalar()
        items = (
            await db.execute(
                text("select count(*) from knowledge_items where project_id = :p"),
                {"p": space_id},
            )
        ).scalar()

        print(f"course     : {course_id}  (owner {str(owner)[:8]})")
        print(f"project_id : {check}")
        print(f"knowledge_items in that space: {items}  (expected 0)")
        print(f"scope_ref would be: space:{space_id}")


async def cleanup() -> None:
    async with AsyncSessionLocal() as db:
        row = (
            await db.execute(
                text("select id from projects where name = :n"),
                {"n": FIXTURE_SPACE_NAME},
            )
        ).first()
        if row is None:
            print("nothing to clean")
            return
        await db.execute(
            text("update courses set project_id = null where project_id = :p"),
            {"p": row[0]},
        )
        await db.execute(text("delete from projects where id = :p"), {"p": row[0]})
        await db.commit()
        print(f"removed space {row[0]} and unlinked its courses")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--cleanup", action="store_true")
    args = ap.parse_args()
    asyncio.run(cleanup() if args.cleanup else create())