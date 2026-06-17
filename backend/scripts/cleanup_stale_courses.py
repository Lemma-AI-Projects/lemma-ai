"""Manually sweep stale course drafts (status != ready, untouched for a while).

Run (from backend/):
    uv run python scripts/cleanup_stale_courses.py [--days N]   # default 7

This is the manual runner for course_service.cleanup_stale_drafts (本期不进
定时任务，按需手动跑)。
"""

import argparse
import asyncio
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.database import AsyncSessionLocal, engine
from services import course_service


async def main() -> int:
    parser = argparse.ArgumentParser(description="Delete stale course drafts.")
    parser.add_argument(
        "--days",
        type=int,
        default=7,
        help="delete non-ready courses untouched for at least this many days",
    )
    args = parser.parse_args()
    before = datetime.now(UTC) - timedelta(days=args.days)
    try:
        async with AsyncSessionLocal() as db:
            removed = await course_service.cleanup_stale_drafts(db, before=before)
    finally:
        await engine.dispose()
    print(f"deleted {removed} stale course draft(s) older than {args.days}d")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
