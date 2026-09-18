"""学习进度 (learner progress) 冒烟。

DB 段（需 DB + 一个 Profile）：临时建一门 ready 课程（1 章 × 2 单元 × 3 学习点），
验证进度上报与聚合：
  - 未过阈值不算完成；过 COMPLETION_RATIO 阈值落 completed_at；
  - completed_at 单调：回拖进度条 / 重看都不会取消完成；
  - duration 只填不清：后续不带 duration 的上报不抹掉已知时长；
  - 无 duration 时比例不可算，学习点保持未完成；
  - get_course_point_progress 只含被碰过的学习点；
  - get_courses_point_counts 给出 (completed, total)；
  - get_course_detail 把 completed / lastPositionSeconds 合并到快照；
  - list_courses 带出完成数；
  - IDOR: 换用户 / 学习点不属于该课程 -> None（404）；
  - list_completions_between 按窗口过滤。

跑法（backend/ 目录下）:
    uv run python scripts/smoke_progress.py
"""

import asyncio
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from core.database import AsyncSessionLocal, engine
from models.course import Course, CourseLesson, CourseModule, CoursePoint
from models.course_point_progress import CoursePointProgress
from models.profile import Profile
from services import course_service, progress_service

FAILURES: list[str] = []

_DURATION = 100
# Just under / just over the completion threshold for a 100s video.
_BELOW = int(_DURATION * progress_service.COMPLETION_RATIO) - 1
_ABOVE = int(_DURATION * progress_service.COMPLETION_RATIO) + 1


def check(condition: bool, label: str) -> None:
    print(f"{'PASS' if condition else 'FAIL'}  {label}")
    if not condition:
        FAILURES.append(label)


async def db_checks() -> None:
    async with AsyncSessionLocal() as db:
        profile = (await db.execute(select(Profile).limit(1))).scalar_one_or_none()
    if profile is None:
        print("SKIP: 库中无 Profile，跳过 DB 段")
        return

    async with AsyncSessionLocal() as db:
        course = Course(
            user_id=profile.id,
            topic="__smoke_progress__",
            title="__smoke_progress__",
            status="ready",
            search_status="searched",
        )
        db.add(course)
        await db.flush()
        module = CourseModule(course_id=course.id, order_index=0, title="M")
        db.add(module)
        await db.flush()
        lesson_a = CourseLesson(module_id=module.id, order_index=0, title="L1")
        lesson_b = CourseLesson(module_id=module.id, order_index=1, title="L2")
        db.add_all([lesson_a, lesson_b])
        await db.flush()
        points = [
            CoursePoint(
                lesson_id=lesson_a.id, order_index=0, title="P1", build_status="ready"
            ),
            CoursePoint(
                lesson_id=lesson_a.id, order_index=1, title="P2", build_status="ready"
            ),
            CoursePoint(
                lesson_id=lesson_b.id, order_index=0, title="P3", build_status="ready"
            ),
        ]
        db.add_all(points)
        await db.commit()
        course_id = course.id
        point_ids = [point.id for point in points]
    print(f"  fixture course_id={course_id}")
    started_at = datetime.now(timezone.utc)

    try:
        # --- 阈值 ---
        async with AsyncSessionLocal() as db:
            result = await progress_service.report_point_progress(
                db,
                user_id=profile.id,
                course_id=course_id,
                point_id=point_ids[0],
                position_seconds=_BELOW,
                duration_seconds=_DURATION,
            )
        check(
            result is not None
            and not result.completed
            and result.last_position_seconds == _BELOW,
            f"未过阈值（{_BELOW}/{_DURATION}）不算完成，位置已记录",
        )

        async with AsyncSessionLocal() as db:
            result = await progress_service.report_point_progress(
                db,
                user_id=profile.id,
                course_id=course_id,
                point_id=point_ids[0],
                position_seconds=_ABOVE,
                duration_seconds=_DURATION,
            )
        check(
            result is not None and result.completed,
            f"过阈值（{_ABOVE}/{_DURATION}）落完成",
        )

        # --- 单调性：回拖不取消完成，duration 只填不清 ---
        async with AsyncSessionLocal() as db:
            result = await progress_service.report_point_progress(
                db,
                user_id=profile.id,
                course_id=course_id,
                point_id=point_ids[0],
                position_seconds=3,
                duration_seconds=None,
            )
        check(
            result is not None
            and result.completed
            and result.last_position_seconds == 3,
            "回拖进度条：仍为完成，位置更新",
        )
        async with AsyncSessionLocal() as db:
            row = (
                await db.execute(
                    select(CoursePointProgress).where(
                        CoursePointProgress.user_id == profile.id,
                        CoursePointProgress.point_id == point_ids[0],
                    )
                )
            ).scalar_one()
            check(
                row.duration_seconds == _DURATION,
                "后续不带 duration 的上报不抹掉已知时长",
            )

        # --- 无 duration：比例不可算 -> 不完成 ---
        async with AsyncSessionLocal() as db:
            result = await progress_service.report_point_progress(
                db,
                user_id=profile.id,
                course_id=course_id,
                point_id=point_ids[1],
                position_seconds=999,
                duration_seconds=None,
            )
        check(
            result is not None and not result.completed,
            "无 duration 时无论位置多大都不算完成",
        )

        # --- 读取聚合 ---
        async with AsyncSessionLocal() as db:
            progress = await progress_service.get_course_point_progress(
                db, user_id=profile.id, course_id=course_id
            )
        check(
            set(progress) == {point_ids[0], point_ids[1]},
            "get_course_point_progress 只含被碰过的学习点",
        )
        check(
            progress[point_ids[0]].completed
            and not progress[point_ids[1]].completed,
            "完成标记逐点正确",
        )

        async with AsyncSessionLocal() as db:
            counts = await progress_service.get_courses_point_counts(
                db, user_id=profile.id, course_ids=[course_id]
            )
        check(
            counts[course_id].completed == 1 and counts[course_id].total == 3,
            f"get_courses_point_counts 得 1/3（实际 {counts[course_id]}）",
        )

        # --- 快照合并 ---
        async with AsyncSessionLocal() as db:
            detail = await course_service.get_course_detail(
                db, user_id=profile.id, course_id=course_id
            )
        snapshot_points = [
            point
            for module in detail.modules
            for lesson in module.lessons
            for point in lesson.points
        ]
        check(
            [point.completed for point in snapshot_points] == [True, False, False],
            "get_course_detail 合并 completed",
        )
        check(
            [point.last_position_seconds for point in snapshot_points]
            == [3, 999, 0],
            "get_course_detail 合并 lastPositionSeconds（未碰过的为 0）",
        )

        async with AsyncSessionLocal() as db:
            items = await course_service.list_courses(db, user_id=profile.id)
        item = next((i for i in items if i.id == course_id), None)
        check(
            item is not None
            and item.completed_point_count == 1
            and item.total_point_count == 3,
            "list_courses 带出 1/3 完成数",
        )

        # --- IDOR ---
        async with AsyncSessionLocal() as db:
            stranger = await progress_service.report_point_progress(
                db,
                user_id=uuid.uuid4(),
                course_id=course_id,
                point_id=point_ids[0],
                position_seconds=10,
                duration_seconds=_DURATION,
            )
        check(stranger is None, "换用户上报 -> None（404）")

        async with AsyncSessionLocal() as db:
            wrong_course = await progress_service.report_point_progress(
                db,
                user_id=profile.id,
                course_id=uuid.uuid4(),
                point_id=point_ids[0],
                position_seconds=10,
                duration_seconds=_DURATION,
            )
        check(wrong_course is None, "学习点不属于该课程 -> None（404）")

        # --- 周窗口 ---
        async with AsyncSessionLocal() as db:
            inside = await progress_service.list_completions_between(
                db,
                user_id=profile.id,
                start=started_at - timedelta(minutes=5),
                end=datetime.now(timezone.utc) + timedelta(minutes=5),
            )
        check(len(inside) == 1, f"窗口内完成数 1（实际 {len(inside)}）")

        async with AsyncSessionLocal() as db:
            outside = await progress_service.list_completions_between(
                db,
                user_id=profile.id,
                start=started_at - timedelta(days=30),
                end=started_at - timedelta(days=29),
            )
        check(outside == [], "窗口外完成数 0")
    finally:
        async with AsyncSessionLocal() as db:
            course = await db.get(Course, course_id)
            if course is not None:
                await db.delete(course)
                await db.commit()
        # 进度行随学习点 CASCADE 一起消失。
        async with AsyncSessionLocal() as db:
            left = (
                await db.execute(
                    select(CoursePointProgress).where(
                        CoursePointProgress.point_id.in_(point_ids)
                    )
                )
            ).scalars().all()
        check(left == [], "删课程后进度行随 CASCADE 清空")


async def main() -> int:
    try:
        await db_checks()
    finally:
        await engine.dispose()

    print()
    if FAILURES:
        print(f"SMOKE FAILED: {len(FAILURES)} 项未过")
        return 1
    print("SMOKE OK: 学习进度（阈值 + 单调性 + 聚合 + IDOR + 窗口）通过")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
