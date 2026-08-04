"""章节概述 (course overview) + 视频工具地基 冒烟。

离线段（无网络/AI/Storage）：
  - course_overview 路由走 gemini_video、media_resolution 默认 MEDIUM；模板非空且学习向
    (含 ## 小标题)。
  - 视频工具声明：load_chapter_video 存在、argless、result_kind=media；companion_service
    能据 context 构出 ToolBinding。
DB 段（需 DB + 一门带 chosen candidate 的章节，--offline 跳过；无则 SKIP）：
  - chapter_overviews 状态机：claim 首次成功 / generating 中再次被拒 / read_snapshot
    generating；mark_ready -> read_ready 命中 + read_snapshot ready；候选不匹配 -> None /
    pending（再选片失效）；mark_failed -> failed 且可重新 claim（断连/失败后重生成）。

跑法（backend/ 目录下）:
    uv run python tests/smoke_overview.py            # 离线 + DB
    uv run python tests/smoke_overview.py --offline  # 仅离线
"""

import asyncio
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from google.genai import types as genai_types
from sqlalchemy import delete, select

from ai import LOAD_CHAPTER_VIDEO, tool_spec
from ai.config import routes_for, validate_routes
from ai.native import gemini_video
from ai.prompts.registry import render_system_prompt
from ai.types import AIUseCase
from core.database import AsyncSessionLocal, engine
from models.chapter_overview import ChapterOverview
from models.course import Course, CourseChapter, CourseUnit
from models.profile import Profile
from services import companion_service, course_overview_service

FAILURES: list[str] = []


def check(condition: bool, label: str) -> None:
    print(f"{'PASS' if condition else 'FAIL'}  {label}")
    if not condition:
        FAILURES.append(label)


def offline_checks() -> None:
    validate_routes()
    routes = routes_for(AIUseCase.COURSE_OVERVIEW)
    check(routes[0].adapter == "gemini_video", "overview 路由走 gemini_video")
    check(
        gemini_video._media_resolution_from_route_extra(routes[0].extra)
        == genai_types.MediaResolution.MEDIA_RESOLUTION_MEDIUM,
        "overview media_resolution = MEDIUM",
    )
    template = render_system_prompt(AIUseCase.COURSE_OVERVIEW)
    check(bool(template.strip()) and "##" in template, "overview 模板非空且学习向 markdown")

    spec = tool_spec(LOAD_CHAPTER_VIDEO)
    check(
        spec.name == LOAD_CHAPTER_VIDEO
        and spec.result_kind == "media"
        and not spec.parameters.get("properties"),
        "load_chapter_video 声明: argless + result_kind=media",
    )
    ctx = companion_service.CompanionTurnContext(
        conversation_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        course_id=uuid.uuid4(),
        question="hi",
        user_sent_at=datetime.now(UTC),
        history=[],
        chapter_id=uuid.uuid4(),
        candidate_id=uuid.uuid4(),
    )
    binding = companion_service._build_video_tool(ctx)
    check(
        binding.spec.name == LOAD_CHAPTER_VIDEO and callable(binding.handler),
        "companion 构出视频 ToolBinding",
    )


async def db_checks() -> None:
    async with AsyncSessionLocal() as db:
        profile = (await db.execute(select(Profile).limit(1))).scalar_one_or_none()
    if profile is None:
        print("SKIP: 库中无 Profile，跳过 DB 段")
        return

    async with AsyncSessionLocal() as db:
        row = (
            await db.execute(
                select(CourseChapter.id, CourseChapter.chosen_candidate_id)
                .join(CourseUnit, CourseChapter.unit_id == CourseUnit.id)
                .join(Course, CourseUnit.course_id == Course.id)
                .where(
                    Course.user_id == profile.id,
                    CourseChapter.chosen_candidate_id.isnot(None),
                )
                .limit(1)
            )
        ).first()
    if row is None:
        print("SKIP: 该用户无已建章节(带 chosen candidate)，跳过 DB 段")
        return
    chapter_id, candidate_id = row
    print(f"  fixture chapter_id={chapter_id} candidate_id={candidate_id}")

    try:
        async with AsyncSessionLocal() as db:
            await db.execute(
                delete(ChapterOverview).where(
                    ChapterOverview.chapter_id == chapter_id
                )
            )
            await db.commit()

        async with AsyncSessionLocal() as db:
            won = await course_overview_service.claim_for_generate(
                db, chapter_id=chapter_id, candidate_id=candidate_id
            )
        check(won, "claim_for_generate 首次成功")

        async with AsyncSessionLocal() as db:
            won_again = await course_overview_service.claim_for_generate(
                db, chapter_id=chapter_id, candidate_id=candidate_id
            )
        check(not won_again, "claim_for_generate generating 中被拒")

        async with AsyncSessionLocal() as db:
            snap = await course_overview_service.read_snapshot(
                db, chapter_id=chapter_id, candidate_id=candidate_id
            )
        check(snap.status == "generating" and snap.markdown is None, "generating 快照")

        async with AsyncSessionLocal() as db:
            await course_overview_service.mark_ready(
                db,
                chapter_id=chapter_id,
                candidate_id=candidate_id,
                markdown="# 概述\n\n## 你将学到什么\n- 测试",
            )
        async with AsyncSessionLocal() as db:
            ready_md = await course_overview_service.read_ready(
                db, chapter_id=chapter_id, candidate_id=candidate_id
            )
            ready_snap = await course_overview_service.read_snapshot(
                db, chapter_id=chapter_id, candidate_id=candidate_id
            )
        check(
            ready_md is not None and "你将学到什么" in ready_md,
            "mark_ready 后 read_ready 命中",
        )
        check(
            ready_snap.status == "ready" and bool(ready_snap.markdown),
            "ready 快照含 markdown",
        )

        async with AsyncSessionLocal() as db:
            mismatch_md = await course_overview_service.read_ready(
                db, chapter_id=chapter_id, candidate_id=uuid.uuid4()
            )
            mismatch_snap = await course_overview_service.read_snapshot(
                db, chapter_id=chapter_id, candidate_id=uuid.uuid4()
            )
        check(mismatch_md is None, "候选不匹配 read_ready -> None (再选片失效)")
        check(mismatch_snap.status == "pending", "候选不匹配快照 -> pending")

        async with AsyncSessionLocal() as db:
            await course_overview_service.mark_failed(
                db, chapter_id=chapter_id, error_type="smoke"
            )
        async with AsyncSessionLocal() as db:
            failed_snap = await course_overview_service.read_snapshot(
                db, chapter_id=chapter_id, candidate_id=candidate_id
            )
            reclaim = await course_overview_service.claim_for_generate(
                db, chapter_id=chapter_id, candidate_id=candidate_id
            )
        check(failed_snap.status == "failed", "mark_failed -> failed 快照")
        check(reclaim, "failed 后可重新 claim (断连/失败重生成)")
    finally:
        async with AsyncSessionLocal() as db:
            await db.execute(
                delete(ChapterOverview).where(
                    ChapterOverview.chapter_id == chapter_id
                )
            )
            await db.commit()


async def main() -> int:
    offline_only = "--offline" in sys.argv[1:]
    print(f"tested_at: {datetime.now(UTC).isoformat()}  (offline_only={offline_only})")
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
    print("SMOKE OK: 章节概述（状态机 + 路由/模板）+ 视频工具地基 通过")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
