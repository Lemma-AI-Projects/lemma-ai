"""ai/coursegen 冒烟：离线验证排序/形状契约，在线真打 LLM+Apify 跑通问卷→大纲→单章研究。

跑法（backend/ 目录下）:
    uv run python tests/smoke_coursegen.py

离线段（必跑，不联网）：rank() 确定性 + top1 加权预期；ChapterResearchResult
的 chosen 与 candidates 同一对象；产物 model_dump 与 schemas/course.py 形状对齐。
在线段（仅当 APIFY_API_TOKEN 配置时）：问卷/大纲/单章研究真打，并核对
provider_usage_logs 把搜索花费按 course_id 归到本次课程。
"""

import asyncio
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from ai import init_ai_runtime, shutdown_ai_runtime
from ai.coursegen import (
    generate_outline,
    generate_questionnaire,
    rank,
    research_chapter,
)
from ai.coursegen.research import _SEARCH_USE_CASE
from ai.coursegen.types import (
    ChapterPlan,
    ChapterResearchResult,
    CourseOutline,
    OutlineChapter,
    OutlineUnit,
    Questionnaire,
    QuestionnaireQuestion,
)
from ai.search.types import SearchPlatform, VideoCandidate
from core.config import settings
from core.database import AsyncSessionLocal, engine
from models.provider_usage_log import ProviderUsageLog
from schemas.course import (
    CourseChapterOut,
    CourseOutlineOut,
    CourseUnitOut,
    QuestionnaireOut,
)

FAILURES: list[str] = []


def check(condition: bool, label: str) -> None:
    status = "PASS" if condition else "FAIL"
    print(f"{status}  {label}")
    if not condition:
        FAILURES.append(label)


def _vc(vid: str, views: int, likes: int, dur: int, pub: datetime) -> VideoCandidate:
    return VideoCandidate(
        platform=SearchPlatform.YOUTUBE,
        platform_video_id=vid,
        url=f"https://www.youtube.com/watch?v={vid}",
        title=vid,
        view_count=views,
        like_count=likes,
        duration_s=dur,
        published_at=pub,
    )


def offline_checks() -> None:
    # --- rank(): 确定性 + top1 加权预期 ---
    a = _vc("vid-A", 1_000_000, 50_000, 900, datetime(2024, 6, 1, tzinfo=UTC))
    b = _vc("vid-B", 2_000_000, 80_000, 30, datetime(2024, 6, 1, tzinfo=UTC))  # 更多播放但是 short
    c = _vc("vid-C", 500_000, 20_000, 1200, datetime(2010, 1, 1, tzinfo=UTC))  # 旧
    d = _vc("vid-D", 10, 0, 600, datetime(2025, 6, 1, tzinfo=UTC))
    plan = ChapterPlan(title="导数的定义", summary="从极限引出导数")
    now = datetime(2026, 6, 17, tzinfo=UTC)
    ranked = rank([d, c, b, a], plan, now=now)
    check(
        [v.platform_video_id for v in ranked] == ["vid-A", "vid-B", "vid-C", "vid-D"],
        "rank 排序确定 (A,B,C,D)",
    )
    check(ranked[0] is a, "rank top1 = A (加权预期)")
    check(
        ranked.index(a) < ranked.index(b),
        "高播放但 short 的 B 排在 A 之后（时长惩罚生效）",
    )
    # 同输入同输出（确定性）
    check(
        [v.platform_video_id for v in rank([a, b, c, d], plan, now=now)]
        == [v.platform_video_id for v in ranked],
        "rank 对相同输入稳定",
    )

    # --- ChapterResearchResult: chosen 与 candidates 同一对象 ---
    result = ChapterResearchResult(candidates=ranked, chosen=ranked[0], reason="测试")
    check(
        result.chosen is not None and any(result.chosen is x for x in result.candidates),
        "ChapterResearchResult.chosen 是 candidates 里的同一对象",
    )

    # --- 形状契约：Questionnaire 与 schemas.QuestionnaireOut 同形 ---
    questionnaire = Questionnaire(
        questions=[
            QuestionnaireQuestion(
                id="current-level", title="你的基础？", options=["零基础", "入门"]
            )
        ]
    )
    q_dump = questionnaire.model_dump()
    check(
        set(q_dump["questions"][0].keys()) == {"id", "title", "options"},
        "Questionnaire question 字段 == {id,title,options}",
    )
    QuestionnaireOut.model_validate(q_dump)  # 形状不漂移则不抛
    check(True, "Questionnaire.model_dump() 可被 QuestionnaireOut 校验（同形）")

    # --- 形状契约：CourseOutline 自身稳定 + 与 wire 类型共享字段对齐 ---
    outline = CourseOutline(
        title="微积分入门",
        units=[
            OutlineUnit(
                title="极限",
                chapters=[OutlineChapter(title="极限的概念", summary="直观理解极限")],
            )
        ],
    )
    o_dump = outline.model_dump()
    check(set(o_dump.keys()) == {"title", "units"}, "CourseOutline 顶层 == {title,units}")
    check(
        set(o_dump["units"][0].keys()) == {"title", "chapters"},
        "OutlineUnit == {title,chapters}",
    )
    check(
        set(o_dump["units"][0]["chapters"][0].keys()) == {"title", "summary"},
        "OutlineChapter == {title,summary}",
    )
    # 与 schemas wire 类型的共享字段对齐（DB 字段 id/status/progress 由 Phase 4 生成）
    check(
        {"title", "units"} <= set(CourseOutlineOut.model_fields)
        and {"title", "chapters"} <= set(CourseUnitOut.model_fields)
        and "title" in CourseChapterOut.model_fields,
        "CourseOutline 共享字段对齐 schemas wire 类型",
    )
    check(
        "summary" in OutlineChapter.model_fields
        and "summary" not in CourseChapterOut.model_fields,
        "summary 是大纲产物字段（落 DB 列，不在读侧 wire）",
    )


async def online_checks() -> None:
    topic = "我想学微积分"

    # 1) 问卷
    questionnaire = await generate_questionnaire(topic)
    check(len(questionnaire.questions) >= 1, "generate_questionnaire >=1 题")
    check(
        all(len(q.options) >= 2 and q.title and q.id for q in questionnaire.questions),
        "每题 >=2 选项且 title/id 非空",
    )

    # 2) 大纲（用问卷首选项作为画像答案）
    answers = {q.id: q.options[0] for q in questionnaire.questions}
    outline = await generate_outline(topic, answers)
    check(bool(outline.title), "generate_outline title 非空")
    check(len(outline.units) >= 1, "outline >=1 unit")
    check(
        all(u.title and len(u.chapters) >= 1 for u in outline.units),
        "每个 unit title 非空且 >=1 chapter",
    )
    check(
        all(ch.title for u in outline.units for ch in u.chapters),
        "每个 chapter title 非空",
    )

    # 3) 单章研究（真打 Apify + LLM），course_id 透传到搜索台账
    course_id = uuid.uuid4()
    first_chapter = outline.units[0].chapters[0]
    plan = ChapterPlan(title=first_chapter.title, summary=first_chapter.summary)
    research = await research_chapter(plan, answers, course_id=course_id)
    check(len(research.candidates) >= 1, "research_chapter 取到 >=1 候选")
    check(research.chosen is not None, "research_chapter chosen 非空")
    check(bool(research.reason), "research_chapter reason 非空")
    if research.chosen is not None:
        check(
            any(research.chosen is x for x in research.candidates),
            "chosen 仍是 candidates 里的同一对象",
        )

    # 4) provider_usage_logs：按 course_id 归账，use_case 为本次搜索
    async with AsyncSessionLocal() as session:
        rows = (
            await session.execute(
                select(ProviderUsageLog).where(
                    ProviderUsageLog.course_id == course_id
                )
            )
        ).scalars().all()
    check(len(rows) >= 1, "provider_usage_logs 落了本次 course_id 的搜索行")
    check(
        all(r.use_case == _SEARCH_USE_CASE for r in rows) and len(rows) >= 1,
        f"搜索台账 use_case == {_SEARCH_USE_CASE!r}（course_id 透传正确）",
    )


async def main() -> int:
    offline_checks()
    if settings.apify_api_token:
        init_ai_runtime()
        try:
            await online_checks()
        finally:
            await shutdown_ai_runtime()
    else:
        print("SKIP: APIFY_API_TOKEN 未配置，跳过联网验收")
    await engine.dispose()

    print()
    if FAILURES:
        print(f"SMOKE FAILED: {len(FAILURES)} 项未过")
        return 1
    print("SMOKE OK: ai/coursegen 课程生成大脑通过")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
