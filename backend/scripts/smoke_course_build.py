"""阶段二冒烟：后台构建编排（状态机 / DB 进度 / 幂等 / 隔离），最后用真
research_chapter 验证换真逻辑后 task/SSE 代码不变即可工作。

跑法（backend/ 目录下）:
    uv run python scripts/smoke_course_build.py

直接 await tasks.course_build.run_build（绕过 Celery worker），仿 smoke_projects。
build_course 内建 Apify client，故整套冒烟需要 APIFY_API_TOKEN（无则整体 SKIP）。
"""

import asyncio
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from ai import init_ai_runtime, shutdown_ai_runtime
from ai.coursegen.types import ChapterResearchResult
from ai.search import SearchPlatform, VideoCandidate
from core.config import settings
from core.database import AsyncSessionLocal, engine
from core.security import CurrentUser
from models.course import Course, CourseChapter, CourseUnit
from models.course_candidate import ChapterVideoCandidate
from models.profile import Profile
from services import course_service
from tasks.course_build import run_build

FAILURES: list[str] = []
CREATED_COURSE_IDS: list[uuid.UUID] = []


def check(condition: bool, label: str) -> None:
    status = "PASS" if condition else "FAIL"
    print(f"{status}  {label}")
    if not condition:
        FAILURES.append(label)


# --- stubs (signature matches coursegen.research_chapter) ---


def _fake_candidate(plan_title: str, n: int) -> VideoCandidate:
    return VideoCandidate(
        platform=SearchPlatform.YOUTUBE,
        platform_video_id=f"stub-{plan_title}-{n}",
        url=f"https://example.com/{plan_title}/{n}",
        title=f"stub video {n} for {plan_title}",
        author="stub-author",
        duration_s=600 + n,
        view_count=1000 * (n + 1),
        like_count=50 * (n + 1),
        thumbnail_url="https://example.com/thumb.jpg",
        raw={"stub": True, "title": plan_title, "n": n},
    )


async def _stub_ok(plan, profile, *, course_id=None, client=None) -> ChapterResearchResult:
    candidates = [_fake_candidate(plan.title, 0), _fake_candidate(plan.title, 1)]
    return ChapterResearchResult(
        candidates=candidates, chosen=candidates[0], reason="stub chosen"
    )


def _make_stub_err(fail_title: str):
    async def _stub(plan, profile, *, course_id=None, client=None) -> ChapterResearchResult:
        if plan.title == fail_title:
            raise RuntimeError("injected chapter failure")
        candidates = [_fake_candidate(plan.title, 0)]
        return ChapterResearchResult(
            candidates=candidates, chosen=candidates[0], reason="ok"
        )

    return _stub


async def _stub_slow(plan, profile, *, course_id=None, client=None) -> ChapterResearchResult:
    await asyncio.sleep(0.3)
    candidates = [_fake_candidate(plan.title, 0)]
    return ChapterResearchResult(candidates=candidates, chosen=candidates[0], reason="ok")


# --- helpers ---


async def _make_course(
    user_id: uuid.UUID,
    *,
    n_units: int,
    n_chapters: int,
    answers: dict[str, str],
    titles: list[str] | None = None,
) -> tuple[uuid.UUID, list[uuid.UUID]]:
    async with AsyncSessionLocal() as db:
        course = Course(
            user_id=user_id,
            topic="冒烟构建主题",
            title="冒烟构建课",
            status="outline_ready",
            intake_json={"answers": answers},
        )
        db.add(course)
        await db.flush()
        chapter_ids: list[uuid.UUID] = []
        for unit_index in range(n_units):
            unit = CourseUnit(
                course_id=course.id,
                order_index=unit_index,
                title=f"unit-{unit_index}",
                status="not_started",
            )
            db.add(unit)
            await db.flush()
            for chapter_index in range(n_chapters):
                title = (
                    titles[len(chapter_ids)]
                    if titles is not None
                    else f"u{unit_index}-ch{chapter_index}"
                )
                chapter = CourseChapter(
                    unit_id=unit.id,
                    order_index=chapter_index,
                    title=title,
                    summary=f"summary for {title}",
                    status="not_started",
                )
                db.add(chapter)
                await db.flush()
                chapter_ids.append(chapter.id)
        await db.commit()
        CREATED_COURSE_IDS.append(course.id)
        return course.id, chapter_ids


async def _chapters(chapter_ids: list[uuid.UUID]) -> list[CourseChapter]:
    async with AsyncSessionLocal() as db:
        rows = (
            await db.execute(
                select(CourseChapter).where(CourseChapter.id.in_(chapter_ids))
            )
        ).scalars().all()
    return list(rows)


async def _candidate_ids(chapter_ids: list[uuid.UUID]) -> set[uuid.UUID]:
    async with AsyncSessionLocal() as db:
        rows = (
            await db.execute(
                select(ChapterVideoCandidate.id).where(
                    ChapterVideoCandidate.chapter_id.in_(chapter_ids)
                )
            )
        ).scalars().all()
    return set(rows)


async def _course_status(course_id: uuid.UUID) -> str | None:
    async with AsyncSessionLocal() as db:
        course = await db.get(Course, course_id)
        return course.status if course else None


def _monotonic(values: list[int]) -> bool:
    return all(b >= a for a, b in zip(values, values[1:]))


# --- sections ---


async def section_happy_path(user_id: uuid.UUID) -> tuple[uuid.UUID, list[uuid.UUID]]:
    course_id, chapter_ids = await _make_course(
        user_id, n_units=2, n_chapters=2, answers={"level": "beginner"}
    )
    await run_build(course_id, research=_stub_ok)

    chapters = await _chapters(chapter_ids)
    check(
        all(c.status == "ready" for c in chapters),
        "happy: 所有章节 status=ready",
    )
    check(
        all(c.progress == 100 for c in chapters),
        "happy: 所有章节 progress=100",
    )
    check(
        all(c.chosen_candidate_id is not None for c in chapters),
        "happy: 所有章节有 chosen_candidate_id",
    )
    check(await _course_status(course_id) == "ready", "happy: course.status=ready")

    async with AsyncSessionLocal() as db:
        cands = (
            await db.execute(
                select(ChapterVideoCandidate).where(
                    ChapterVideoCandidate.chapter_id.in_(chapter_ids)
                )
            )
        ).scalars().all()
    check(len(cands) == len(chapter_ids) * 2, "happy: 每章 2 个候选入库")
    chosen = [c for c in cands if c.is_chosen]
    check(len(chosen) == len(chapter_ids), "happy: 每章恰好 1 个 is_chosen")
    check(
        all(c.like_count is not None for c in cands),
        "happy: 候选 like_count 已入库",
    )
    check(all(bool(c.raw_json) for c in cands), "happy: 候选 raw_json 已入库")

    async with AsyncSessionLocal() as db:
        detail = await course_service.get_course_detail(
            db, user_id=user_id, course_id=course_id
        )
    check(detail is not None and detail.progress == 100, "happy: 快照 course progress=100")
    return course_id, chapter_ids


async def section_idempotent(
    user_id: uuid.UUID, course_id: uuid.UUID, chapter_ids: list[uuid.UUID]
) -> None:
    before = await _candidate_ids(chapter_ids)
    await run_build(course_id, research=_stub_ok)  # rerun
    after = await _candidate_ids(chapter_ids)
    check(after == before, "幂等: 已 ready 章节不重做（候选 id 不变、不翻倍）")
    check(await _course_status(course_id) == "ready", "幂等: course 仍为 ready")


async def section_error_isolation(user_id: uuid.UUID) -> None:
    titles = ["ch-0", "ch-1", "ch-2"]
    course_id, chapter_ids = await _make_course(
        user_id, n_units=1, n_chapters=3, answers={}, titles=titles
    )
    await run_build(course_id, research=_make_stub_err("ch-0"))

    chapters = {c.title: c for c in await _chapters(chapter_ids)}
    check(chapters["ch-0"].status == "failed", "隔离: 抛错的章节 -> failed")
    check(
        chapters["ch-1"].status == "ready" and chapters["ch-2"].status == "ready",
        "隔离: 其余章节 -> ready",
    )
    check(
        await _course_status(course_id) == "ready",
        "隔离: 有成功章则整课 ready（不崩）",
    )


async def section_progress_monotonic(user_id: uuid.UUID) -> None:
    course_id, _ = await _make_course(
        user_id, n_units=2, n_chapters=2, answers={}
    )
    task = asyncio.create_task(run_build(course_id, research=_stub_slow))
    samples: list[int] = []
    while not task.done():
        async with AsyncSessionLocal() as db:
            detail = await course_service.get_course_detail(
                db, user_id=user_id, course_id=course_id
            )
        if detail is not None:
            samples.append(detail.progress)
        await asyncio.sleep(0.1)
    await task  # surface any orchestration error
    async with AsyncSessionLocal() as db:
        final = await course_service.get_course_detail(
            db, user_id=user_id, course_id=course_id
        )
    assert final is not None
    samples.append(final.progress)
    check(_monotonic(samples), f"进度: 总 progress 单调不降 {samples}")
    check(samples[-1] == 100, "进度: 终态 progress=100")


async def section_real_research(user_id: uuid.UUID) -> None:
    course_id, chapter_ids = await _make_course(
        user_id,
        n_units=1,
        n_chapters=1,
        answers={"level": "beginner", "goal": "exam"},
        titles=["极限的概念"],
    )
    init_ai_runtime()
    try:
        await run_build(course_id)  # default = real coursegen.research_chapter
    finally:
        await shutdown_ai_runtime()

    chapters = await _chapters(chapter_ids)
    course_status = await _course_status(course_id)
    check(
        chapters[0].status in ("ready", "failed"),
        f"真逻辑: 章节进入终态 (status={chapters[0].status})",
    )
    check(course_status in ("ready", "failed"), f"真逻辑: course 终态 ({course_status})")
    if chapters[0].status == "ready":
        check(
            chapters[0].chosen_candidate_id is not None,
            "真逻辑: ready 章节有 chosen_candidate_id",
        )
        async with AsyncSessionLocal() as db:
            cands = (
                await db.execute(
                    select(ChapterVideoCandidate).where(
                        ChapterVideoCandidate.chapter_id == chapter_ids[0]
                    )
                )
            ).scalars().all()
        check(len(cands) >= 1, "真逻辑: 真实候选入库")
        check(all(bool(c.raw_json) for c in cands), "真逻辑: 候选 raw_json 入库")


async def _cleanup() -> None:
    async with AsyncSessionLocal() as db:
        for course_id in CREATED_COURSE_IDS:
            course = await db.get(Course, course_id)
            if course is not None:
                await db.delete(course)  # cascade units/chapters/candidates
        await db.commit()


async def main() -> int:
    if not settings.apify_api_token:
        print("SKIP: APIFY_API_TOKEN 未配置（build_course 内建 Apify client）")
        return 0

    try:
        async with AsyncSessionLocal() as s:
            profile = (await s.execute(select(Profile).limit(1))).scalar_one()
        user = CurrentUser(id=profile.id, email=profile.email)

        course_id, chapter_ids = await section_happy_path(user.id)
        await section_idempotent(user.id, course_id, chapter_ids)
        await section_error_isolation(user.id)
        await section_progress_monotonic(user.id)
        await section_real_research(user.id)
    finally:
        await _cleanup()
        await engine.dispose()

    print()
    if FAILURES:
        print(f"SMOKE FAILED: {len(FAILURES)} 项未过")
        return 1
    print("SMOKE OK: 课程阶段二 (build + 进度) 全链路通过")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
