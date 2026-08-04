"""AI 伴学 (course companion) 冒烟。

离线段（无网络/AI/Storage）：
  - course_companion 模板非空且面向视频；路由走 gemini_video；media_resolution
    默认 MEDIUM；CompanionChatRequest camelCase 解析。
DB 段（需 DB + 一门已建好的课程，--offline 跳过；无合适章节则自动 SKIP）：
  - chapter_gemini_files 状态机：claim(首次成功/再次被拒) -> mark_ready -> read_usable
    命中 -> 候选不匹配/过期返回 None；
  - prepare_turn IDOR：陌生课程 / 课程内无该章节 -> None；合法 -> context。
不调用 Gemini / Storage（真实带视频问答需 re-host 资产，见 smoke_video_delivery
与下一轮前端联调）。

跑法（backend/ 目录下）:
    uv run python tests/smoke_companion.py            # 离线 + DB
    uv run python tests/smoke_companion.py --offline  # 仅离线
"""

import asyncio
import sys
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from google.genai import types as genai_types
from sqlalchemy import delete, select

from ai.config import routes_for, validate_routes
from ai.media import provider_files
from ai.media.inputs import from_provider_file
from ai.native import gemini_video
from ai.prompts.registry import render_system_prompt
from ai.types import AIUseCase
from core.database import AsyncSessionLocal, engine
from core.security import CurrentUser
from models.chapter_gemini_file import ChapterGeminiFile
from models.course import Course, CourseChapter, CourseUnit
from models.profile import Profile
from schemas.companion import CompanionChatRequest
from services import companion_service, gemini_file_service

FAILURES: list[str] = []


def check(condition: bool, label: str) -> None:
    status = "PASS" if condition else "FAIL"
    print(f"{status}  {label}")
    if not condition:
        FAILURES.append(label)


def offline_checks() -> None:
    validate_routes()
    template = render_system_prompt(AIUseCase.COURSE_COMPANION)
    check(
        bool(template.strip()) and "load_chapter_video" in template,
        "companion 模板非空且说明可调 load_chapter_video 工具",
    )

    routes = routes_for(AIUseCase.COURSE_COMPANION)
    check(routes[0].adapter == "gemini_video", "companion 路由走 gemini_video")
    check(
        gemini_video._media_resolution_from_route_extra({})
        == genai_types.MediaResolution.MEDIA_RESOLUTION_MEDIUM,
        "media_resolution 默认 MEDIUM",
    )
    check(
        gemini_video._media_resolution_from_route_extra({"media_resolution": "low"})
        == genai_types.MediaResolution.MEDIA_RESOLUTION_LOW,
        "media_resolution low 映射正确",
    )

    request = CompanionChatRequest.model_validate(
        {"chapterId": str(uuid.uuid4()), "message": "为什么这里要这样推导？"}
    )
    check(
        isinstance(request.chapter_id, uuid.UUID) and request.conversation_id is None,
        "CompanionChatRequest camelCase 解析",
    )
    no_chapter = CompanionChatRequest.model_validate({"message": "纯文本提问"})
    check(
        no_chapter.chapter_id is None,
        "CompanionChatRequest chapterId 可选(可为 null)",
    )


async def db_checks() -> None:
    async with AsyncSessionLocal() as db:
        profile = (await db.execute(select(Profile).limit(1))).scalar_one_or_none()
    if profile is None:
        print("SKIP: 库中无 Profile，跳过 DB 段")
        return
    user = CurrentUser(id=profile.id, email=None)

    async with AsyncSessionLocal() as db:
        row = (
            await db.execute(
                select(
                    CourseChapter.id,
                    CourseChapter.chosen_candidate_id,
                    CourseUnit.course_id,
                )
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
    chapter_id, candidate_id, course_id = row
    print(f"  fixture chapter_id={chapter_id} candidate_id={candidate_id}")

    # --- chapter_gemini_files 状态机 ---
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(
                delete(ChapterGeminiFile).where(
                    ChapterGeminiFile.chapter_id == chapter_id
                )
            )
            await db.commit()

        async with AsyncSessionLocal() as db:
            claimed = await gemini_file_service.claim_for_ingest(
                db, chapter_id=chapter_id, candidate_id=candidate_id
            )
        check(claimed, "claim_for_ingest 首次成功")

        async with AsyncSessionLocal() as db:
            claimed_again = await gemini_file_service.claim_for_ingest(
                db, chapter_id=chapter_id, candidate_id=candidate_id
            )
        check(not claimed_again, "claim_for_ingest 第二次(uploading 中)被拒")

        fresh = from_provider_file(
            file_id="files/smoke",
            file_uri="https://example/smoke",
            file_platform=provider_files.PLATFORM_AIHUBMIX_GEMINI,
            mime_type="video/mp4",
            expires_at=datetime.now(UTC) + timedelta(hours=40),
        )
        async with AsyncSessionLocal() as db:
            await gemini_file_service.mark_ready(
                db, chapter_id=chapter_id, candidate_id=candidate_id, video=fresh
            )
        async with AsyncSessionLocal() as db:
            usable = await gemini_file_service.read_usable(
                db, chapter_id=chapter_id, candidate_id=candidate_id
            )
        check(
            usable is not None and usable.url == "https://example/smoke",
            "mark_ready 后 read_usable 命中",
        )

        async with AsyncSessionLocal() as db:
            mismatched = await gemini_file_service.read_usable(
                db, chapter_id=chapter_id, candidate_id=uuid.uuid4()
            )
        check(mismatched is None, "候选不匹配 read_usable 返回 None")

        async with AsyncSessionLocal() as db:
            await gemini_file_service.mark_ready(
                db,
                chapter_id=chapter_id,
                candidate_id=candidate_id,
                video=from_provider_file(
                    file_id="files/expired",
                    file_uri="https://example/expired",
                    file_platform=provider_files.PLATFORM_AIHUBMIX_GEMINI,
                    mime_type="video/mp4",
                    expires_at=datetime.now(UTC) - timedelta(minutes=1),
                ),
            )
        async with AsyncSessionLocal() as db:
            expired = await gemini_file_service.read_usable(
                db, chapter_id=chapter_id, candidate_id=candidate_id
            )
        check(expired is None, "过期 read_usable 返回 None")
    finally:
        async with AsyncSessionLocal() as db:
            await db.execute(
                delete(ChapterGeminiFile).where(
                    ChapterGeminiFile.chapter_id == chapter_id
                )
            )
            await db.commit()

    # --- prepare_turn IDOR ---
    async with AsyncSessionLocal() as db:
        foreign_course = await companion_service.prepare_turn(
            db,
            CompanionChatRequest(chapter_id=chapter_id, message="hi"),
            user,
            course_id=uuid.uuid4(),
        )
    check(foreign_course is None, "prepare_turn: 陌生课程 -> None")

    # 契约变更: 课程内无该章节(或无视频) 不再 404 —— 返回 context 但 candidate 为 None
    # (视频工具届时退化为 unavailable，纯文本作答)。
    async with AsyncSessionLocal() as db:
        bad_chapter = await companion_service.prepare_turn(
            db,
            CompanionChatRequest(chapter_id=uuid.uuid4(), message="hi"),
            user,
            course_id=course_id,
        )
    check(
        bad_chapter is not None and bad_chapter.candidate_id is None,
        "prepare_turn: 课程内无该章节 -> context(candidate=None, 不再 404)",
    )

    # 契约变更: chapterId 省略(纯文本节点) 也合法 —— context.chapter_id/candidate 均 None。
    async with AsyncSessionLocal() as db:
        no_chapter_ctx = await companion_service.prepare_turn(
            db,
            CompanionChatRequest(message="hi"),
            user,
            course_id=course_id,
        )
    check(
        no_chapter_ctx is not None
        and no_chapter_ctx.chapter_id is None
        and no_chapter_ctx.candidate_id is None,
        "prepare_turn: 无 chapterId -> context(纯文本)",
    )

    async with AsyncSessionLocal() as db:
        context = await companion_service.prepare_turn(
            db,
            CompanionChatRequest(chapter_id=chapter_id, message="hi"),
            user,
            course_id=course_id,
        )
    check(
        context is not None
        and context.candidate_id == candidate_id
        and bool(context.new_conversation_title),
        "prepare_turn: 合法 -> context(含 candidate + 新会话标题)",
    )


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
    print("SMOKE OK: AI 伴学（缓存状态机 + IDOR + 路由/模板）通过")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
