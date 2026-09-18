"""DEV-ONLY: inventory and wipe the whole course domain before the 四层重构.

The structure migration drops and recreates every course table, and Supabase
Storage has NO cascade from the database — deleting rows would strand every
`chapters/<uuid>.mp4` object forever. So the order is: inventory (prove it's
only test data) -> delete Storage objects -> delete the course rows.

Run from backend/, with the worker and beat STOPPED:

    uv run python scripts/wipe_course_domain.py                 # inventory only
    uv run python scripts/wipe_course_domain.py --apply         # actually wipe
    uv run python scripts/wipe_course_domain.py --apply --clear-tool-cards

Raw SQL on purpose: this runs against the OLD schema (course_units /
course_chapters / chapter_video_assets) and must keep working after the ORM has
already been rewritten for the new one.

Deleting a course cascades to units -> chapters -> candidates / assets /
gemini files / overviews, and to its companion conversations (and their
messages). Gemini Files API uploads expire on their own (~48h) — nothing to do.
"""

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text

from core import storage
from core.config import settings
from core.database import AsyncSessionLocal, engine

# Object-key prefix the retired downloader wrote under (tasks/video_download.py
# used `chapters/{chapter_id}.mp4`). Swept for orphans left by earlier deletes.
_LEGACY_PREFIX = "chapters/"

_INVENTORY_SQL = text(
    """
    SELECT status, count(*) AS n
    FROM courses
    GROUP BY status
    ORDER BY status
    """
)

_ASSET_KEYS_SQL = text(
    """
    SELECT storage_path
    FROM chapter_video_assets
    WHERE storage_path IS NOT NULL
    """
)

_COUNTS_SQL = text(
    """
    SELECT
      (SELECT count(*) FROM courses) AS courses,
      (SELECT count(*) FROM course_units) AS units,
      (SELECT count(*) FROM course_chapters) AS chapters,
      (SELECT count(*) FROM chapter_video_assets) AS assets,
      (SELECT count(*) FROM ai_conversations WHERE course_id IS NOT NULL)
        AS companion_conversations
    """
)

# Course cards in old chats point at course ids that will no longer exist. The
# frontend renders a "course gone" state for them, so this is optional; pass
# --clear-tool-cards to strip the cards instead.
_CLEAR_TOOL_CARDS_SQL = text(
    """
    UPDATE ai_messages
    SET tool_json = NULL
    WHERE tool_json ->> 'type' = 'course_planning'
    """
)


def _list_legacy_objects(client: object) -> list[str]:
    """Every object still sitting under the legacy `chapters/` prefix."""
    keys: list[str] = []
    paginator = client.get_paginator("list_objects_v2")  # type: ignore[attr-defined]
    for page in paginator.paginate(
        Bucket=settings.supabase_storage_bucket, Prefix=_LEGACY_PREFIX
    ):
        keys.extend(item["Key"] for item in page.get("Contents", []))
    return keys


async def _inventory() -> tuple[list[str], dict[str, int]]:
    async with AsyncSessionLocal() as db:
        by_status = (await db.execute(_INVENTORY_SQL)).all()
        counts = (await db.execute(_COUNTS_SQL)).mappings().one()
        keys = [row[0] for row in (await db.execute(_ASSET_KEYS_SQL)).all()]

    print("courses by status:")
    for status, n in by_status:
        print(f"  {status:<14} {n}")
    if not by_status:
        print("  (none)")
    print(
        "rows: "
        f"courses={counts['courses']} units={counts['units']} "
        f"chapters={counts['chapters']} assets={counts['assets']} "
        f"companion_conversations={counts['companion_conversations']}"
    )
    print(f"storage objects referenced by asset rows: {len(keys)}")
    return keys, dict(counts)


async def _wipe(asset_keys: list[str], *, clear_tool_cards: bool) -> None:
    # 1. Storage first: once the rows are gone we can't find the keys again.
    try:
        client = storage.build_s3_client()
    except storage.StorageError as exc:
        print(f"! storage not configured ({exc}); skipping object deletion")
    else:
        orphans = [key for key in _list_legacy_objects(client) if key not in asset_keys]
        all_keys = [*asset_keys, *orphans]
        if all_keys:
            deleted = storage.delete_objects(client, keys=all_keys)
            print(
                f"deleted {len(deleted)}/{len(all_keys)} storage objects "
                f"({len(orphans)} were orphans under {_LEGACY_PREFIX})"
            )
        else:
            print("no storage objects to delete")

    # 2. Rows: one DELETE, the FK cascade does the rest.
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("DELETE FROM courses"))
        if clear_tool_cards:
            cards = await db.execute(_CLEAR_TOOL_CARDS_SQL)
            print(f"cleared {cards.rowcount or 0} course_planning tool card(s)")
        await db.commit()
        print(f"deleted {result.rowcount or 0} course(s) and everything below them")


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="actually delete (default is a read-only inventory)",
    )
    parser.add_argument(
        "--clear-tool-cards",
        action="store_true",
        help="also strip course_planning cards from old chat messages",
    )
    args = parser.parse_args()

    try:
        asset_keys, counts = await _inventory()
        if not args.apply:
            print("\ndry run — re-run with --apply to delete. Stop the Celery")
            print("worker and beat first, or an in-flight task will recreate rows.")
            return 0
        if not counts["courses"]:
            print("\nnothing to wipe")
            return 0
        print()
        await _wipe(asset_keys, clear_tool_cards=args.clear_tool_cards)
    finally:
        await engine.dispose()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
