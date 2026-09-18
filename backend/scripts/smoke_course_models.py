"""Course 域模型冒烟：建四层课程树 → 读回断言层级/时间戳 → 候选与选中 → 级联删除，
并验证 CourseDetailOut 从 ORM 直出 camelCase 嵌套快照。

跑法（backend/ 目录下）:
    uv run python scripts/smoke_course_models.py

纯 ORM + schema 直测，与 smoke_projects 同款风格。
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
from models.course import Course, CourseLesson, CourseModule, CoursePoint
from models.point_video_candidate import PointVideoCandidate
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

        # --- 1. 建课程树：Course(intake) + 2 module × 2 lesson × 2 point ---
        module_ids: list[uuid.UUID] = []
        lesson_ids: list[uuid.UUID] = []
        point_ids: list[uuid.UUID] = []
        first_point_id: uuid.UUID | None = None
        async with AsyncSessionLocal() as db:
            course = Course(
                user_id=user_id,
                topic="冒烟：我想从零开始学线性代数",
                title="线性代数冒烟课",
                description="冒烟用课程简介",
                status="intake",
                intake_json={"answers": {"level": "zero"}},
            )
            db.add(course)
            await db.flush()

            for m in range(2):
                module = CourseModule(
                    course_id=course.id,
                    order_index=m,
                    title=f"第 {m + 1} 章",
                    summary=f"第 {m + 1} 章简介",
                )
                db.add(module)
                await db.flush()
                module_ids.append(module.id)
                for le in range(2):
                    lesson = CourseLesson(
                        module_id=module.id,
                        order_index=le,
                        title=f"单元 {m + 1}.{le + 1}",
                        summary=f"单元 {m + 1}.{le + 1} 概述",
                    )
                    db.add(lesson)
                    await db.flush()
                    lesson_ids.append(lesson.id)
                    for p in range(2):
                        point = CoursePoint(
                            lesson_id=lesson.id,
                            order_index=p,
                            title=f"学习点 {m + 1}.{le + 1}.{p + 1}",
                            build_status="not_started",
                        )
                        db.add(point)
                        await db.flush()
                        point_ids.append(point.id)
                        if first_point_id is None:
                            first_point_id = point.id

            assert first_point_id is not None
            for k in range(3):
                db.add(
                    PointVideoCandidate(
                        point_id=first_point_id,
                        platform="youtube" if k % 2 == 0 else "bilibili",
                        platform_video_id=f"smoke-vid-{k}",
                        url=f"https://example.com/watch?v=smoke-vid-{k}",
                        title=f"候选视频 {k + 1}",
                        author=f"作者 {k + 1}",
                        duration_s=600 + k,
                        # Above the old int32 ceiling: the delivery table is
                        # BigInteger now, so a hot video needs no clamping.
                        view_count=3_000_000_000 + k,
                        like_count=100 * (k + 1),
                        thumbnail_url=f"https://example.com/thumb-{k}.jpg",
                        score=Decimal("0.90") - Decimal(k) / 100,
                        discovery_source="smoke",
                        raw_json={"k": k, "note": "smoke raw payload"},
                    )
                )
            await db.commit()
            course_id = course.id

        # --- 2. 读回：层级正确、created_at 非空、默认值 ---
        async with AsyncSessionLocal() as db:
            course = (
                await db.execute(
                    select(Course)
                    .where(Course.id == course_id)
                    .options(
                        selectinload(Course.modules)
                        .selectinload(CourseModule.lessons)
                        .selectinload(CourseLesson.points)
                    )
                )
            ).scalar_one()

            check(course.created_at is not None, "course.created_at 非空")
            check(course.updated_at is not None, "course.updated_at 非空")
            check(len(course.modules) == 2, "course 含 2 个 module")
            check(
                [m.order_index for m in course.modules] == [0, 1],
                "module 按 order_index 排序",
            )
            lessons_flat = [le for m in course.modules for le in m.lessons]
            check(len(lessons_flat) == 4, "共 4 个 lesson")
            points_flat = [p for le in lessons_flat for p in le.points]
            check(len(points_flat) == 8, "共 8 个 point")
            check(
                all(p.created_at is not None for p in points_flat),
                "point.created_at 非空",
            )
            check(
                all(p.build_status == "not_started" for p in points_flat),
                "point.build_status 持久化",
            )

            cands = (
                (
                    await db.execute(
                        select(PointVideoCandidate).where(
                            PointVideoCandidate.point_id == first_point_id
                        )
                    )
                )
                .scalars()
                .all()
            )
            check(len(cands) == 3, "首个学习点含 3 个候选")
            check(
                all(c.view_count > 2_147_483_647 for c in cands),
                "candidate.view_count 支持 BigInteger（无需截断）",
            )
            check(
                all(c.is_chosen is False for c in cands),
                "候选默认 is_chosen=False (server_default)",
            )

            # --- 3. 纯逻辑：CourseDetailOut 从 ORM 直出 camelCase 嵌套快照 ---
            dumped = CourseDetailOut.model_validate(course).model_dump(by_alias=True)
            check(
                set(dumped.keys())
                == {
                    "id",
                    "title",
                    "description",
                    "coverUrl",
                    "status",
                    "questionnaireReady",
                    "modules",
                },
                "CourseDetailOut 顶层键集正确",
            )
            module0 = dumped["modules"][0]
            check(
                set(module0.keys()) == {"id", "title", "summary", "lessons"},
                "快照 module 键集正确",
            )
            lesson0 = module0["lessons"][0]
            check(
                set(lesson0.keys()) == {"id", "title", "summary", "points"},
                "快照 lesson 键集正确",
            )
            point0 = lesson0["points"][0]
            check(
                set(point0.keys())
                == {
                    "id",
                    "title",
                    "buildStatus",
                    "completed",
                    "lastPositionSeconds",
                },
                "快照 point 键集正确（生成态 buildStatus + 学习进度两字段）",
            )
            check(
                point0["completed"] is False and point0["lastPositionSeconds"] == 0,
                "未学过的学习点进度为 false/0",
            )
            order_index_leaks = (
                not _no_order_index(dumped)
                or any(not _no_order_index(m) for m in dumped["modules"])
                or any(
                    not _no_order_index(le)
                    for m in dumped["modules"]
                    for le in m["lessons"]
                )
                or any(
                    not _no_order_index(p)
                    for m in dumped["modules"]
                    for le in m["lessons"]
                    for p in le["points"]
                )
            )
            check(not order_index_leaks, "快照不泄漏 order_index/orderIndex")

            item = CourseListItemOut.model_validate(course).model_dump(by_alias=True)
            check(
                "updatedAt" in item and "updated_at" not in item,
                "CourseListItemOut 输出 updatedAt (camelCase)",
            )
            check("coverUrl" in item, "CourseListItemOut 含 coverUrl")

        # --- 4. 选中：is_chosen=True + 回写 point.chosen_candidate_id ---
        async with AsyncSessionLocal() as db:
            chosen = (
                await db.execute(
                    select(PointVideoCandidate)
                    .where(PointVideoCandidate.point_id == first_point_id)
                    .limit(1)
                )
            ).scalar_one()
            chosen.is_chosen = True
            point = await db.get(CoursePoint, first_point_id)
            point.chosen_candidate_id = chosen.id
            await db.commit()
            chosen_id = chosen.id

        async with AsyncSessionLocal() as db:
            chosen = await db.get(PointVideoCandidate, chosen_id)
            point = await db.get(CoursePoint, first_point_id)
            check(chosen.is_chosen is True, "候选 is_chosen=True 持久化")
            check(
                point.chosen_candidate_id == chosen_id,
                "point.chosen_candidate_id 回写成功",
            )

        # --- 5. provider_usage_logs 台账：追加 → 读回 → 清理（无 FK，手动清） ---
        trace_id = f"smoke-{uuid.uuid4()}"
        async with AsyncSessionLocal() as db:
            db.add(
                ProviderUsageLog(
                    provider="apify",
                    actor_id="smoke-actor",
                    platform="youtube",
                    use_case="course_topic_search",
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

        # --- 6. 级联：删 course → module/lesson/point/candidate 全没 ---
        async with AsyncSessionLocal() as db:
            course = await db.get(Course, course_id)
            await db.delete(course)
            await db.commit()

        async with AsyncSessionLocal() as db:
            check((await db.get(Course, course_id)) is None, "course 已删除")
            for label, model, ids in (
                ("module", CourseModule, module_ids),
                ("lesson", CourseLesson, lesson_ids),
                ("point", CoursePoint, point_ids),
            ):
                left = (
                    (await db.execute(select(model).where(model.id.in_(ids))))
                    .scalars()
                    .all()
                )
                check(len(left) == 0, f"级联: 所属 {label} 全删")
            cands_left = (
                (
                    await db.execute(
                        select(PointVideoCandidate).where(
                            PointVideoCandidate.point_id == first_point_id
                        )
                    )
                )
                .scalars()
                .all()
            )
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
