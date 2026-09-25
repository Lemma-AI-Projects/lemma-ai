"""P3 parse-quality report: parse failure and degradation rates per XKW course.

Run (from backend/):
    # report over everything already stored
    uv run python scripts/qbank_parse_report.py
    # first sample N questions per course from XKW (http provider; bills!)
    QBANK_XKW_PROVIDER=http uv run python scripts/qbank_parse_report.py \
        --fetch --course-ids 27,28 --per-course 20

Metrics per course (current versions only):
  total      stored questions
  raw        massive-edition / no qml-stem (read-only by design)
  failed     parser crashed and degraded to raw (a bug to fix)
  auto       every slot machine-gradable (eligible for sets)
  degraded   questions with >=1 unsupported / unknown-grading slot
Sampling respects QBANK_GLOBAL_DAILY_CALL_CAP and stops a course after
ceil(per_course / 10) + 1 calls.
"""

import argparse
import asyncio
import math
import sys
import uuid
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from core.config import settings
from core.database import AsyncSessionLocal, engine
from models.question import Question, QuestionVersion
from qbank.usage import count_billable_calls_since
from qbank.xkw.errors import XkwError
from qbank.xkw.provider import build_provider
from qbank.xkw.types import CallContext, QuestionQuery
from services import question_bank_service


async def _sample(course_ids: list[int], per_course: int) -> None:
    provider = build_provider()
    ctx = CallContext(use_case="parse_report", trace_id=uuid.uuid4().hex)
    try:
        for course_id in course_ids:
            session_id: str | None = None
            stored = 0
            for _ in range(math.ceil(per_course / 10) + 1):
                if settings.qbank_xkw_provider == "http":
                    since = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
                    if await count_billable_calls_since(since) >= settings.qbank_global_daily_call_cap:
                        print("daily XKW call cap reached; stopping sampling")
                        return
                try:
                    page = await provider.fetch_questions(
                        QuestionQuery(course_id=course_id, count=10, session_id=session_id), ctx=ctx
                    )
                except XkwError as exc:
                    print(f"course {course_id}: fetch failed ({exc.code}): {exc.message}")
                    break
                session_id = page.session_id or session_id
                if not page.questions:
                    break
                async with AsyncSessionLocal() as db:
                    for raw in page.questions:
                        question = await question_bank_service.upsert_question(
                            db,
                            raw,
                            objective=None,
                            provider=question_bank_service.storage_provider(provider.name),
                        )
                        await question_bank_service.ensure_current_version(db, question)
                        stored += 1
                    await db.commit()
                if stored >= per_course:
                    break
            print(f"course {course_id}: sampled {stored} question(s)")
    finally:
        await provider.aclose()


async def _report(provider: str) -> None:
    async with AsyncSessionLocal() as db:
        rows = await db.execute(
            select(
                Question.xkw_course_id,
                Question.type_name,
                QuestionVersion.parse_status,
                QuestionVersion.fully_auto,
                QuestionVersion.degraded_slot_count,
            )
            .join(QuestionVersion, QuestionVersion.question_id == Question.id)
            .where(QuestionVersion.is_current.is_(True), Question.provider == provider)
        )
        stats: dict[object, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        types: dict[object, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        for course_id, type_name, status, auto, degraded in rows.all():
            entry = stats[course_id]
            entry["total"] += 1
            entry[status] += 1
            entry["auto"] += 1 if auto else 0
            entry["degraded"] += 1 if degraded else 0
            types[course_id][type_name or "?"] += 1
    if not stats:
        print("no stored questions")
        return
    print(f"{'course':>8} {'total':>6} {'raw%':>6} {'failed%':>8} {'auto%':>6} {'degraded%':>10}  types")
    for course_id, entry in sorted(stats.items(), key=lambda item: str(item[0])):
        total = entry["total"]

        def pct(key: str, _total: int = total, _entry: dict[str, int] = entry) -> str:
            return f"{100 * _entry[key] / _total:.1f}"

        top_types = ", ".join(f"{name}×{count}" for name, count in sorted(types[course_id].items(), key=lambda kv: -kv[1])[:5])
        print(
            f"{course_id!s:>8} {total:>6} {pct('raw'):>6} {pct('failed'):>8} "
            f"{pct('auto'):>6} {pct('degraded'):>10}  {top_types}"
        )


async def main() -> int:
    parser = argparse.ArgumentParser(description="Question parse-quality report.")
    parser.add_argument("--fetch", action="store_true", help="sample from XKW before reporting")
    parser.add_argument("--course-ids", default="", help="comma-separated XKW course ids")
    parser.add_argument("--per-course", type=int, default=20)
    parser.add_argument(
        "--provider",
        default=question_bank_service.PROVIDER_XKW,
        choices=[question_bank_service.PROVIDER_XKW, question_bank_service.PROVIDER_XKW_FIXTURE],
        help="which stored content to report on (default: real XKW)",
    )
    args = parser.parse_args()
    try:
        if args.fetch:
            course_ids = [int(part) for part in args.course_ids.split(",") if part.strip()]
            if not course_ids:
                print("--fetch needs --course-ids")
                return 1
            await _sample(course_ids, args.per_course)
        await _report(args.provider)
    finally:
        await engine.dispose()
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
