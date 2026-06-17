"""Course 域模型冒烟：建课程树 → 读回断言层级/时间戳 → 候选与选中 → 级联删除，
并验证 CourseDetailOut 从 ORM 直出 camelCase 嵌套快照。

跑法（backend/ 目录下）:
    uv run python scripts/smoke_course_models.py

纯 ORM + schema 直测（Phase 1 无 service/api），与 smoke_projects 同款风格。
"""

import asyncio
import sys
import uuid
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from core.database import AsyncSessionLocal, engine
from models.course import Course, CourseChapter, CourseUnit
from models.course_candidate import ChapterVideoCandidate
from models.profile import Profile
from models.provider_usage_log import ProviderUsageLog
from schemas.course import CourseDetailOut, CourseListItemOut

FAILURES: list[str] = []


def check(condition: bool, label: str) -> None:
    status = "PASS" if condition else "FAIL"
    print(f"{status}  {label}")
    if not condition:
        FAILURES.append(label)


def _no_order_index(payload: dict) -> bool:
    keys = set(payload.keys())
    return "order_index" not in keys and "orderIndex" not in keys


async def main() -> int:
    try:
        async with AsyncSessionLocal() as s:
            profile = (await s.execute(select(Profile).limit(1))).scalar_one()
        user_id = profile.id

        # --- 1. 建课程树：Course(intake) + 2 unit × 2 chapter，首章 3 候选 ---
        units: list[CourseUnit] = []
        chapters: list[CourseChapter] = []
        first_chapter: CourseChapter | None = None
        async with AsyncSessionLocal() as db:
            course = Course(
                user_id=user_id,
                topic="冒烟：我想从零开始学线性代数",
                title="线性代数冒烟课",
                status="intake",
                intake_json={"goal": "smoke", "answers": []},
            )
            db.add(course)
            await db.flush()

            for u in range(2):
                unit = CourseUnit(
                    course_id=course.id,
                    order_index=u,
                    title=f"单元 {u + 1}",
                    status="not_started",
                )
                db.add(unit)
                await db.flush()
                units.append(unit)
                for c in range(2):
                    chapter = CourseChapter(
                        unit_id=unit.id,
                        order_index=c,
                        title=f"章节 {u + 1}.{c + 1}",
                        status="not_started",
                    )
                    db.add(chapter)
                    await db.flush()
                    chapters.append(chapter)
                    if u == 0 and c == 0:
                        first_chapter = chapter

            assert first_chapter is not None
            for k in range(3):
                db.add(
                    ChapterVideoCandidate(
                        chapter_id=first_chapter.id,
                        platform="youtube" if k % 2 == 0 else "bilibili",
                        platform_video_id=f"smoke-vid-{k}",
                        url=f"https://example.com/watch?v=smoke-vid-{k}",
                        title=f"候选视频 {k + 1}",
                        author=f"作者 {k + 1}",
                        duration_s=600 + k,
                        view_count=1000 * (k + 1),
                        like_count=100 * (k + 1),
                        thumbnail_url=f"https://example.com/thumb-{k}.jpg",
                        score=Decimal("0.90") - Decimal(k) / 100,
                        discovery_source="smoke",
                        raw_json={"k": k, "note": "smoke raw payload"},
                    )
                )
            await db.commit()

            course_id = course.id
            unit_ids = [u.id for u in units]
            chapter_ids = [ch.id for ch in chapters]
            first_chapter_id = first_chapter.id

        # --- 2. 读回：层级正确、created_at 非空、默认值 ---
        async with AsyncSessionLocal() as db:
            course = (
                await db.execute(
                    select(Course)
                    .where(Course.id == course_id)
                    .options(
                        selectinload(Course.units).selectinload(CourseUnit.chapters)
                    )
                )
            ).scalar_one()

            check(course.created_at is not None, "course.created_at 非空")
            check(course.updated_at is not None, "course.updated_at 非空")
            check(len(course.units) == 2, "course 含 2 个 unit")
            check(
                [u.order_index for u in course.units] == [0, 1],
                "unit 按 order_index 排序",
            )
            check(
                all(len(u.chapters) == 2 for u in course.units),
                "每个 unit 含 2 个 chapter",
            )
            check(
                all(u.created_at is not None for u in course.units),
                "unit.created_at 非空",
            )
            chapters_flat = [ch for u in course.units for ch in u.chapters]
            check(
                all(ch.created_at is not None for ch in chapters_flat),
                "chapter.created_at 非空",
            )
            check(
                all(ch.progress == 0 for ch in chapters_flat),
                "chapter.progress 默认 0 (server_default)",
            )

            cands = (
                await db.execute(
                    select(ChapterVideoCandidate).where(
                        ChapterVideoCandidate.chapter_id == first_chapter_id
                    )
                )
            ).scalars().all()
            check(len(cands) == 3, "首章含 3 个候选")
            check(
                all(c.created_at is not None for c in cands),
                "candidate.created_at 非空",
            )
            check(
                {c.view_count for c in cands} == {1000, 2000, 3000}
                and {c.like_count for c in cands} == {100, 200, 300},
                "candidate.view_count / like_count 持久化",
            )
            check(
                all(c.is_chosen is False for c in cands),
                "候选默认 is_chosen=False (server_default)",
            )
            check(
                all(c.raw_json is not None for c in cands),
                "candidate.raw_json 持有原始项",
            )

            # --- 3. 纯逻辑：CourseDetailOut 从 ORM 直出 camelCase 嵌套快照 ---
            dumped = CourseDetailOut.model_validate(course).model_dump(by_alias=True)
            check(
                set(dumped.keys()) == {"id", "title", "status", "progress", "units"},
                "CourseDetailOut 顶层键集正确",
            )
            check(len(dumped["units"]) == 2, "快照 units 嵌套正确 (2)")
            unit0 = dumped["units"][0]
            check(
                set(unit0.keys())
                == {"id", "title", "status", "progress", "chapters"},
                "快照 unit 键集正确",
            )
            check(len(unit0["chapters"]) == 2, "快照 chapters 嵌套正确 (2)")
            chapter0 = unit0["chapters"][0]
            check(
                set(chapter0.keys()) == {"id", "title", "status", "progress"},
                "快照 chapter 键集正确",
            )
            order_index_leaks = (
                not _no_order_index(dumped)
                or any(not _no_order_index(u) for u in dumped["units"])
                or any(
                    not _no_order_index(c)
                    for u in dumped["units"]
                    for c in u["chapters"]
                )
            )
            check(not order_index_leaks, "快照不泄漏 order_index/orderIndex")

            # camelCase 转换在多词字段上的实证：updated_at -> updatedAt
            item = CourseListItemOut.model_validate(course).model_dump(by_alias=True)
            check(
                "updatedAt" in item and "updated_at" not in item,
                "CourseListItemOut 输出 updatedAt (camelCase)",
            )

        # --- 4. 选中：is_chosen=True + 回写 chapter.chosen_candidate_id ---
        async with AsyncSessionLocal() as db:
            chosen = (
                await db.execute(
                    select(ChapterVideoCandidate)
                    .where(ChapterVideoCandidate.chapter_id == first_chapter_id)
                    .limit(1)
                )
            ).scalar_one()
            chosen.is_chosen = True
            chapter = await db.get(CourseChapter, first_chapter_id)
            chapter.chosen_candidate_id = chosen.id
            await db.commit()
            chosen_id = chosen.id

        async with AsyncSessionLocal() as db:
            chosen = await db.get(ChapterVideoCandidate, chosen_id)
            chapter = await db.get(CourseChapter, first_chapter_id)
            check(chosen.is_chosen is True, "候选 is_chosen=True 持久化")
            check(
                chapter.chosen_candidate_id == chosen_id,
                "chapter.chosen_candidate_id 回写成功",
            )

        # --- 5. provider_usage_logs 台账：追加 → 读回 → 清理（无 FK，手动清） ---
        trace_id = f"smoke-{uuid.uuid4()}"
        async with AsyncSessionLocal() as db:
            db.add(
                ProviderUsageLog(
                    provider="apify",
                    actor_id="smoke-actor",
                    platform="youtube",
                    use_case="chapter_query",
                    run_id="smoke-run",
                    result_count=5,
                    cost_usd=Decimal("0.01230000"),
                    latency_ms=1234,
                    success=True,
                    course_id=course_id,
                    trace_id=trace_id,
                )
            )
            await db.commit()
        async with AsyncSessionLocal() as db:
            row = (
                await db.execute(
                    select(ProviderUsageLog).where(
                        ProviderUsageLog.trace_id == trace_id
                    )
                )
            ).scalar_one()
            check(
                row.created_at is not None and row.cost_usd == Decimal("0.01230000"),
                "provider_usage_logs 追加+读回成功",
            )
            await db.delete(row)
            await db.commit()

        # --- 6. 级联：删 course → unit/chapter/candidate 全没 ---
        async with AsyncSessionLocal() as db:
            course = await db.get(Course, course_id)
            await db.delete(course)
            await db.commit()

        async with AsyncSessionLocal() as db:
            check((await db.get(Course, course_id)) is None, "course 已删除")
            units_left = (
                await db.execute(
                    select(CourseUnit).where(CourseUnit.id.in_(unit_ids))
                )
            ).scalars().all()
            check(len(units_left) == 0, "级联: 所属 unit 全删")
            chapters_left = (
                await db.execute(
                    select(CourseChapter).where(CourseChapter.id.in_(chapter_ids))
                )
            ).scalars().all()
            check(len(chapters_left) == 0, "级联: 所属 chapter 全删")
            cands_left = (
                await db.execute(
                    select(ChapterVideoCandidate).where(
                        ChapterVideoCandidate.chapter_id == first_chapter_id
                    )
                )
            ).scalars().all()
            check(len(cands_left) == 0, "级联: 所属 candidate 全删")
    finally:
        await engine.dispose()

    print()
    if FAILURES:
        print(f"SMOKE FAILED: {len(FAILURES)} 项未过")
        return 1
    print("SMOKE OK: course 域模型/契约/级联全部通过")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
