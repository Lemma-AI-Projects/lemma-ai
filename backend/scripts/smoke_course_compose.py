"""搜索前置课程编排冒烟。

离线段（无 DB/AI/网络）：
  - prompt 模板渲染 + compose 的"供给决定规模"意图在模板里；
  - compose 零信任校验 _resolve_modules：非法/重复/越界 candidate_ref 被剔除，
    空单元 / 空章自底向上剪掉，每个存活学习点都绑定真实候选；
  - 学习点总数硬上限生效。
联网段（需 DB + AI + 网络，默认跑，--offline 跳过）：
  诉求级广搜 → 缓存候选池 → compose(选片+组织) → persist 落三层并 materialize 到
  point_video_candidates(is_chosen) + chosen_candidate_id → 校验交付链形状 + AI 台账，
  最后删课验证级联（含 course_search_candidates）。

跑法（backend/ 目录下）:
    uv run python scripts/smoke_course_compose.py            # 离线 + 联网
    uv run python scripts/smoke_course_compose.py --offline  # 仅离线
"""

import asyncio
import sys
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from ai import init_ai_runtime, shutdown_ai_runtime
from ai.coursegen import compose_course, search_topic
from ai.coursegen.compose import _MAX_POINTS, _resolve_modules, candidate_ref
from ai.coursegen.types import (
    ComposedCourse,
    ComposedLesson,
    ComposedModule,
    ComposedPoint,
)
from ai.prompts.registry import render_system_prompt
from ai.search import SearchPlatform, VideoCandidate, aclose_search_clients
from ai.types import AIUseCase
from core.database import AsyncSessionLocal, engine
from models.ai_usage_log import AiUsageLog
from models.course import CourseModule, CoursePoint
from models.course_search_candidate import CourseSearchCandidate
from models.point_video_candidate import PointVideoCandidate
from models.profile import Profile
from services import course_build_service, course_search_service, course_service

FAILURES: list[str] = []


def check(condition: bool, label: str) -> None:
    status = "PASS" if condition else "FAIL"
    print(f"{status}  {label}")
    if not condition:
        FAILURES.append(label)


def _candidate(vid: str, title: str) -> VideoCandidate:
    return VideoCandidate(
        platform=SearchPlatform.YOUTUBE,
        platform_video_id=vid,
        url=f"https://www.youtube.com/watch?v={vid}",
        title=title,
        view_count=1000,
    )


def _all_points(modules: list) -> list:
    return [p for m in modules for le in m.lessons for p in le.points]


def offline_checks() -> None:
    # --- 模板 ---
    topic_tpl = render_system_prompt(AIUseCase.TOPIC_SEARCH)
    compose_tpl = render_system_prompt(AIUseCase.COURSE_COMPOSE)
    check(bool(topic_tpl.strip()), "topic_search 模板非空")
    check(bool(compose_tpl.strip()), "course_compose 模板非空")
    check(
        "candidate_ref" in compose_tpl and "供给质量" in compose_tpl,
        "compose 模板写明 candidate_ref 约束 + 供给决定规模",
    )
    check(
        "学习点" in compose_tpl and "单元" in compose_tpl and "章" in compose_tpl,
        "compose 模板写明 章 → 单元 → 学习点 三层",
    )

    # --- 零信任校验 _resolve_modules ---
    c1, c2, c3 = _candidate("v1", "基础"), _candidate("v2", "进阶"), _candidate("v3", "实战")
    by_ref = {candidate_ref(c): c for c in (c1, c2, c3)}
    composed = ComposedCourse(
        title="测试课",
        description="测试课简介",
        modules=[
            ComposedModule(
                title="第一章",
                summary="章简介",
                lessons=[
                    ComposedLesson(
                        title="单元一",
                        summary="单元概述",
                        points=[
                            ComposedPoint(
                                title="学习点一", candidate_ref=candidate_ref(c1)
                            ),
                            ComposedPoint(
                                title="伪造", candidate_ref="youtube:DOES_NOT_EXIST"
                            ),
                            ComposedPoint(
                                title="重复 c1", candidate_ref=candidate_ref(c1)
                            ),
                        ],
                    ),
                    ComposedLesson(title="空单元(应被丢)", points=[]),
                ],
            ),
            ComposedModule(
                title="第二章",
                lessons=[
                    ComposedLesson(
                        title="单元二",
                        points=[
                            ComposedPoint(
                                title="学习点二", candidate_ref=candidate_ref(c2)
                            )
                        ],
                    )
                ],
            ),
            ComposedModule(title="空章(应被丢)", lessons=[]),
        ],
    )
    modules = _resolve_modules(composed, by_ref)
    points = _all_points(modules)
    all_vids = [p.candidate.platform_video_id for p in points]
    check(
        all_vids == ["v1", "v2"],
        "校验后仅保留合法且去重的候选 (v1,v2；伪造/重复/越界剔除)",
    )
    check(len(modules) == 2, "空章被剔除 (剩 2 章)")
    check(
        [len(m.lessons) for m in modules] == [1, 1],
        "空单元被剔除 (每章剩 1 个单元)",
    )
    check(
        all(candidate_ref(p.candidate) in by_ref for p in points),
        "每个存活学习点都绑定真实候选",
    )
    check(
        modules[0].summary == "章简介" and modules[0].lessons[0].summary == "单元概述",
        "章/单元 summary 被保留",
    )

    # --- 学习点总数硬上限 ---
    many = [_candidate(f"cap{i}", f"视频{i}") for i in range(_MAX_POINTS + 5)]
    cap_by_ref = {candidate_ref(c): c for c in many}
    over = ComposedCourse(
        title="超量课",
        modules=[
            ComposedModule(
                title="唯一章",
                lessons=[
                    ComposedLesson(
                        title="唯一单元",
                        points=[
                            ComposedPoint(title=c.title, candidate_ref=candidate_ref(c))
                            for c in many
                        ],
                    )
                ],
            )
        ],
    )
    capped = _all_points(_resolve_modules(over, cap_by_ref))
    check(
        len(capped) == _MAX_POINTS,
        f"学习点总数封顶在 {_MAX_POINTS} (实际 {len(capped)})",
    )


async def online_checks() -> None:
    since = datetime.now(UTC)
    topic = "线性代数"

    async with AsyncSessionLocal() as db:
        profile = (await db.execute(select(Profile).limit(1))).scalar_one_or_none()
    if profile is None:
        print("SKIP: 库中无 Profile，跳过联网贯通段")
        return
    user_id = profile.id

    # 1) 建课程壳
    async with AsyncSessionLocal() as db:
        course = await course_service.create_course(
            db, user_id=user_id, topic=topic, conversation_id=None, intake_json=None
        )
        course_id = course.id
    print(f"  course_id={course_id}")

    try:
        # 2) 诉求级广搜（自建-only，无需 APIFY token）
        candidates = await search_topic(topic, course_id=course_id, client=None)
        check(len(candidates) >= 1, f"广搜返回候选 (n={len(candidates)})")
        if not candidates:
            return

        # 3) 缓存候选池 + 翻 search_status + round-trip
        async with AsyncSessionLocal() as db:
            n = await course_search_service.persist_search_candidates(
                db, course_id=course_id, candidates=candidates
            )
            await course_search_service.set_search_status(
                db, course_id=course_id, status=course_search_service.SEARCHED
            )
        async with AsyncSessionLocal() as db:
            pool = await course_search_service.load_search_candidates(
                db, course_id=course_id
            )
            status_now = await course_search_service.read_search_status(
                db, course_id=course_id
            )
        check(len(pool) == n >= 1, "候选池落库 + round-trip 数量一致")
        check(status_now == "searched", "search_status=searched")
        check(
            all(c.platform and c.platform_video_id and c.url and c.title for c in pool),
            "候选池 round-trip 关键字段非空",
        )

        # 4) compose（选片 + 组织 + 零信任校验）
        result = await compose_course(topic, {}, pool)
        check(result is not None, "compose 返回非空结果")
        if result is None:
            return
        pool_refs = {candidate_ref(c) for c in pool}
        points = _all_points(result.modules)
        check(
            result.point_count >= 1, f"compose 至少 1 个学习点 (n={result.point_count})"
        )
        check(
            result.point_count <= _MAX_POINTS,
            f"compose 学习点数不超上限 {_MAX_POINTS}",
        )
        check(
            all(candidate_ref(p.candidate) in pool_refs for p in points),
            "每个学习点都绑定真实候选池条目 (校验生效)",
        )
        refs = [candidate_ref(p.candidate) for p in points]
        check(len(refs) == len(set(refs)), "学习点间无重复候选")
        check(bool(result.description.strip()), "compose 产出课程简介 description")

        # 5) 落库 + materialize 到交付表
        async with AsyncSessionLocal() as db:
            final_status = await course_build_service.persist_composed_course(
                db, course_id=course_id, result=result
            )
        check(final_status == "materializing", "persist -> course materializing")
        async with AsyncSessionLocal() as db:
            detail = await course_service.get_course_detail(
                db, user_id=user_id, course_id=course_id
            )
        check(
            detail is not None and detail.status == "materializing",
            "课程快照 materializing",
        )
        assert detail is not None
        check(len(detail.modules) >= 1, "落库 >=1 module")
        lesson_count = sum(len(m.lessons) for m in detail.modules)
        check(lesson_count >= 1, "落库 >=1 lesson")
        point_ids = [
            p.id for m in detail.modules for le in m.lessons for p in le.points
        ]
        check(len(point_ids) >= 1, "落库 >=1 point")
        check(
            detail.description is not None and detail.description.strip() != "",
            "课程 description 回填快照",
        )

        # 交付链形状：每个学习点有 chosen_candidate_id 指向一条 is_chosen 的候选
        async with AsyncSessionLocal() as db:
            rows = (
                (
                    await db.execute(
                        select(CoursePoint).where(CoursePoint.id.in_(point_ids))
                    )
                )
                .scalars()
                .all()
            )
            check(
                all(p.chosen_candidate_id is not None for p in rows),
                "每个学习点 chosen_candidate_id 已回填",
            )
            check(
                all(p.build_status == "researching" for p in rows),
                "学习点出生 build_status=researching",
            )
            chosen_ids = [p.chosen_candidate_id for p in rows]
            chosen_rows = (
                (
                    await db.execute(
                        select(PointVideoCandidate).where(
                            PointVideoCandidate.id.in_(chosen_ids)
                        )
                    )
                )
                .scalars()
                .all()
            )
            check(
                len(chosen_rows) == len(rows)
                and all(r.is_chosen for r in chosen_rows),
                "交付表 materialize: 每个学习点 1 条 is_chosen 候选",
            )

        # 6) AI 台账
        async with AsyncSessionLocal() as db:
            usage_rows = (
                (
                    await db.execute(
                        select(AiUsageLog)
                        .where(AiUsageLog.created_at >= since)
                        .where(
                            AiUsageLog.use_case.in_(
                                [
                                    AIUseCase.TOPIC_SEARCH.value,
                                    AIUseCase.COURSE_COMPOSE.value,
                                ]
                            )
                        )
                    )
                )
                .scalars()
                .all()
            )
            use_cases = {r.use_case for r in usage_rows}
        check("course_compose" in use_cases, "ai_usage_logs 记录了 course_compose")
        check("topic_search" in use_cases, "ai_usage_logs 记录了 topic_search")
    finally:
        # 7) 清理：删课级联三层 + candidates + course_search_candidates
        async with AsyncSessionLocal() as db:
            course = await course_service.get_owned_course(
                db, user_id=user_id, course_id=course_id
            )
            if course is not None:
                await course_service.delete_course(db, course)
        async with AsyncSessionLocal() as db:
            pool_left = (
                (
                    await db.execute(
                        select(CourseSearchCandidate).where(
                            CourseSearchCandidate.course_id == course_id
                        )
                    )
                )
                .scalars()
                .all()
            )
            modules_left = (
                (
                    await db.execute(
                        select(CourseModule).where(CourseModule.course_id == course_id)
                    )
                )
                .scalars()
                .all()
            )
        check(len(pool_left) == 0, "级联: course_search_candidates 随课程删除")
        check(len(modules_left) == 0, "级联: modules 随课程删除")


async def main() -> int:
    offline_only = "--offline" in sys.argv[1:]
    print(f"tested_at: {datetime.now(UTC).isoformat()}  (offline_only={offline_only})")
    init_ai_runtime()
    try:
        offline_checks()
        if not offline_only:
            await online_checks()
        else:
            print("SKIP: --offline 指定，跳过联网贯通段")
    finally:
        await aclose_search_clients()
        await shutdown_ai_runtime()
        await engine.dispose()

    print()
    if FAILURES:
        print(f"SMOKE FAILED: {len(FAILURES)} 项未过")
        return 1
    print("SMOKE OK: 搜索前置课程编排（广搜→compose→落三层→交付链）通过")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
