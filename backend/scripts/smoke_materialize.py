"""物料化门禁 (course materialization gate) 冒烟。

离线段（无网络/AI/Storage）：
  - 注册位 CONTENT_STEPS 含 OverviewStep(name='overview')；
  - 物料化相关模块可导入。
DB 段（需 DB + 一个 Profile，--offline 跳过）：临时建一门 materializing 课程（2 章
  researching），验证 strict-gate 原子翻转 + 进度计数 + 章状态写入 + chapter 上下文：
  - get_materialization_progress 计数；set_chapter_status 落 ready/failed；
  - finalize_ready 仅在全章 ready 才翻 ready（单赢家）；finalize_failed 仅在任一章
    failed 才翻 failed；翻完非 materializing 后再调返回 False；
  - load_chapter_materialize_context 返回 course/user/candidate。
不触发 chord / Celery / AI（端到端真实物料化需 worker + 视频，见联调）。

跑法（backend/ 目录下）:
    uv run python scripts/smoke_materialize.py            # 离线 + DB
    uv run python scripts/smoke_materialize.py --offline  # 仅离线
"""

import asyncio
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from core.database import AsyncSessionLocal, engine
from models.course import Course, CourseChapter, CourseUnit
from models.profile import Profile
from services import course_build_service, course_service
from services.materialization import CONTENT_STEPS

FAILURES: list[str] = []


def check(condition: bool, label: str) -> None:
    print(f"{'PASS' if condition else 'FAIL'}  {label}")
    if not condition:
        FAILURES.append(label)


def offline_checks() -> None:
    names = [step.name for step in CONTENT_STEPS]
    check(names == ["overview"], f"CONTENT_STEPS 注册 [overview]（实际 {names}）")
    # Import surface (chord tasks + step core) loads without error.
    import tasks.course_materialize as cm  # noqa: F401
    from services.materialization import overview_core  # noqa: F401

    check(True, "物料化模块导入成功")


async def db_checks() -> None:
    async with AsyncSessionLocal() as db:
        profile = (await db.execute(select(Profile).limit(1))).scalar_one_or_none()
    if profile is None:
        print("SKIP: 库中无 Profile，跳过 DB 段")
        return

    candidate_a = uuid.uuid4()
    candidate_b = uuid.uuid4()
    async with AsyncSessionLocal() as db:
        course = Course(
            user_id=profile.id,
            topic="__smoke_materialize__",
            title="__smoke_materialize__",
            status="materializing",
            search_status="searched",
        )
        db.add(course)
        await db.flush()
        unit = CourseUnit(
            course_id=course.id, order_index=0, title="U", status="ready"
        )
        db.add(unit)
        await db.flush()
        ch_a = CourseChapter(
            unit_id=unit.id,
            order_index=0,
            title="C1",
            status="researching",
            progress=0,
            chosen_candidate_id=candidate_a,
        )
        ch_b = CourseChapter(
            unit_id=unit.id,
            order_index=1,
            title="C2",
            status="researching",
            progress=0,
            chosen_candidate_id=candidate_b,
        )
        db.add_all([ch_a, ch_b])
        await db.commit()
        course_id, chapter_a_id, chapter_b_id = course.id, ch_a.id, ch_b.id
    print(f"  fixture course_id={course_id}")

    try:
        async with AsyncSessionLocal() as db:
            ctx = await course_service.load_chapter_materialize_context(
                db, chapter_id=chapter_a_id
            )
        check(
            ctx is not None
            and ctx.course_id == course_id
            and ctx.user_id == profile.id
            and ctx.candidate_id == candidate_a,
            "load_chapter_materialize_context 返回 course/user/candidate",
        )

        async with AsyncSessionLocal() as db:
            done, total, failed = await course_service.get_materialization_progress(
                db, course_id=course_id
            )
        check((done, total, failed) == (0, 2, 0), "初始进度 0/2/0")

        # Not all ready, none failed -> neither flip fires.
        async with AsyncSessionLocal() as db:
            check(
                not await course_build_service.finalize_ready(db, course_id=course_id),
                "finalize_ready 在未全 ready 时不翻",
            )
        async with AsyncSessionLocal() as db:
            check(
                not await course_build_service.finalize_failed(
                    db, course_id=course_id
                ),
                "finalize_failed 在无 failed 时不翻",
            )

        async with AsyncSessionLocal() as db:
            await course_service.set_chapter_status(
                db, chapter_id=chapter_a_id, status="ready"
            )
        async with AsyncSessionLocal() as db:
            done, total, failed = await course_service.get_materialization_progress(
                db, course_id=course_id
            )
        check((done, total, failed) == (1, 2, 0), "set ready 后进度 1/2/0")
        # 自动重试只重入未就绪章节（已 ready 的跳过）。
        async with AsyncSessionLocal() as db:
            pending = await course_service.get_unfinished_chapter_ids(
                db, course_id=course_id
            )
        check(
            pending == [chapter_b_id],
            "get_unfinished_chapter_ids 仅返回未就绪章节",
        )
        async with AsyncSessionLocal() as db:
            check(
                not await course_build_service.finalize_ready(db, course_id=course_id),
                "finalize_ready 在部分 ready 时不翻",
            )

        async with AsyncSessionLocal() as db:
            await course_service.set_chapter_status(
                db, chapter_id=chapter_b_id, status="ready"
            )
        async with AsyncSessionLocal() as db:
            flipped = await course_build_service.finalize_ready(
                db, course_id=course_id
            )
        check(flipped, "finalize_ready 在全 ready 时翻 ready（赢家）")
        async with AsyncSessionLocal() as db:
            course = await db.get(Course, course_id)
            check(course.status == "ready", "课程 status=ready")
        async with AsyncSessionLocal() as db:
            check(
                not await course_build_service.finalize_ready(db, course_id=course_id),
                "finalize_ready 在非 materializing 时再调返回 False",
            )

        # Reset to materializing + fail one chapter -> strict gate fails the course.
        async with AsyncSessionLocal() as db:
            course = await db.get(Course, course_id)
            course.status = "materializing"
            await db.commit()
        async with AsyncSessionLocal() as db:
            await course_service.set_chapter_status(
                db, chapter_id=chapter_b_id, status="failed"
            )
        async with AsyncSessionLocal() as db:
            check(
                not await course_build_service.finalize_ready(db, course_id=course_id),
                "有 failed 时 finalize_ready 不翻",
            )
        async with AsyncSessionLocal() as db:
            flipped = await course_build_service.finalize_failed(
                db, course_id=course_id
            )
        check(flipped, "finalize_failed 在任一 failed 时翻 failed（赢家）")
        async with AsyncSessionLocal() as db:
            course = await db.get(Course, course_id)
            check(course.status == "failed", "课程 status=failed")
    finally:
        async with AsyncSessionLocal() as db:
            course = await db.get(Course, course_id)
            if course is not None:
                await db.delete(course)
                await db.commit()


async def main() -> int:
    offline_only = "--offline" in sys.argv[1:]
    print(f"tested_at offline_only={offline_only}")
    try:
        offline_checks()
        if offline_only:
            print("SKIP: --offline 指定，跳过 DB 段")
        else:
            await db_checks()
    finally:
        await engine.dispose()

    print()
    if FAILURES:
        print(f"SMOKE FAILED: {len(FAILURES)} 项未过")
        return 1
    print("SMOKE OK: 物料化门禁（strict-gate 翻转 + 进度计数 + 注册位）通过")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
