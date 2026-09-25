"""Developer entry: build a question set straight from XKW query conditions.

Run (from backend/):
    uv run python scripts/qbank_build_set.py --user-id <profile uuid> \
        --course-id 0 [--kpoint-ids 1,2] [--type-ids 0101] [--difficulty 18,19] \
        [--count 5] [--kind quiz] [--mode batch] [--title ...] [--inline]

The set is owned by --user-id (it then shows up in /sandbox/quiz for that
user). By default the build is enqueued to Celery (a worker must run);
--inline runs it in this process instead. With QBANK_XKW_PROVIDER=fixture
(default) the doc samples are served and nothing is billed; course 0 means
"every fixture course" (XKW itself has no course 0).
"""

import argparse
import asyncio
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.config import settings
from core.database import AsyncSessionLocal, engine
from models.profile import Profile
from qbank.types import BuildSpec
from services import question_set_service


def _ints(value: str) -> list[int]:
    return [int(part) for part in value.split(",") if part.strip()]


def _strs(value: str) -> list[str]:
    return [part.strip() for part in value.split(",") if part.strip()]


async def main() -> int:
    parser = argparse.ArgumentParser(description="Build a question set from XKW.")
    parser.add_argument("--user-id", required=True, type=uuid.UUID)
    parser.add_argument("--course-id", required=True, type=int, help="XKW course id (学段×学科)")
    parser.add_argument("--kpoint-ids", type=_ints, default=[])
    parser.add_argument("--catalog-ids", type=_ints, default=[])
    parser.add_argument("--type-ids", type=_strs, default=[])
    parser.add_argument("--difficulty", type=_ints, default=[], help="levels 17..21")
    parser.add_argument("--count", type=int, default=5)
    parser.add_argument("--kind", default="quiz", choices=["quiz", "assignment", "practice", "paper"])
    parser.add_argument("--mode", default="batch", choices=["batch", "immediate"])
    parser.add_argument("--title", default=None)
    parser.add_argument("--inline", action="store_true", help="run the build in this process")
    args = parser.parse_args()

    if not settings.qbank_xkw_enabled:
        print("QBANK_XKW_ENABLED is off; refusing to build")
        return 1
    spec = BuildSpec(
        xkw_course_id=args.course_id,
        kpoint_ids=args.kpoint_ids,
        catalog_ids=args.catalog_ids,
        type_ids=args.type_ids,
        difficulty_levels=args.difficulty,
        count=args.count,
    )
    try:
        async with AsyncSessionLocal() as db:
            if await db.get(Profile, args.user_id) is None:
                print(f"no profile {args.user_id}: sign in once so /users/me creates it")
                return 1
            question_set = await question_set_service.create_set(
                db, user_id=args.user_id, spec=spec, kind=args.kind, mode=args.mode, title=args.title
            )
    finally:
        await engine.dispose()
    print(f"created question set {question_set.id} ({settings.qbank_xkw_provider} provider)")

    if args.inline:
        from tasks.question_set_build import run_build

        status = await run_build(question_set.id)
        print(f"build finished: {status}")
        return 0 if status == "ready" else 2

    from tasks.question_set_build import build_question_set

    build_question_set.delay(str(question_set.id))
    print("build enqueued (qbank.build_set); poll GET /api/v1/question-sets/{id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
