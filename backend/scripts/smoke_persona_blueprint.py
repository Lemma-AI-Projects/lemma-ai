"""冒烟：画像 + 蓝图前问卷 + tuning 注入（回归集 A 阶段雏形）。

跑法（backend/ 目录下，需真实模型凭证）:
    uv run python scripts/smoke_persona_blueprint.py

链路: ① `FreeCoursePipeline(stop_at="path")` 只到 intent->map->path 且不产 done →
② 问卷帧由 `_QUESTION_SET` + persona `describe` 组装 → ③ 同一 map + 同一节，
分别以 quick_scan 与 systematic 两 tuning 调 `design_blueprint`，断言 sequence 长度不同
（体量确实进了写入侧）。
phase2 续跑（落 tuning_json 后 blueprint->content 并 finalize）属事件层 + DB 链路，
需真实 DB 与迁移后方可跑通，故本脚本不横跨它——由单测覆盖 merge 逻辑。
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ai import init_ai_runtime, shutdown_ai_runtime
from ai.free_course.blueprint import design_blueprint
from ai.free_course.learner_state import BasicLearnerStateProvider
from ai.free_course.persona import UserProfile
from ai.free_course.pipeline import FreeCoursePipeline
from ai.free_course.types import PathStep
from services.free_course_events import _QUESTION_SET

REQUEST = "我想系统性地从零学泰语，目标是能看懂字幕"

FAILURES = 0


def check(name: str, cond: bool) -> None:
    global FAILURES
    if not cond:
        FAILURES += 1
    print(f"[{'OK ' if cond else 'FAIL'}] {name}")


async def main() -> int:
    init_ai_runtime()
    try:
        pipeline = FreeCoursePipeline(stop_at="path")
        steps: list[str] = []
        async for event in pipeline.stream(REQUEST, user_id="smoke"):
            if event.status == "finished":
                steps.append(event.step)
                print(f"    step={event.step} · detail={event.detail}")
            elif event.status == "failed":
                print(f"    failed at {event.step}: {event.error_message}")

        check("phase1 frames stop at path (no done)", steps == ["intent", "map", "path"])
        check(
            "paused before a product (resume handles populated)",
            pipeline.product is None and pipeline.intent is not None
            and pipeline.learning_map is not None,
        )
        check("questionnaire has 4 questions", len(_QUESTION_SET) == 4)
        check(
            "questionnaire covers the 4 dims",
            {q.key for q in _QUESTION_SET} == {"course_volume", "depth", "focus", "pace"},
        )

        # Same slot, two volumes: volume must reach the writer and change length.
        first_unit = pipeline.learning_map.units[0]
        first_lesson = first_unit.lessons[0]
        target = PathStep(
            unit_title=first_unit.title,
            lesson_title=first_lesson.title,
            objective=first_lesson.objective,
            status="unknown",
        )
        learner_state = await BasicLearnerStateProvider(
            observed_attempts=0
        ).get(user_id="smoke", intent=pipeline.intent)
        quick = await design_blueprint(
            pipeline.learning_map, target,
            learner_state=learner_state, user_id="smoke",
            tuning=UserProfile(course_volume="quick_scan", focus="examples"),
        )
        systematic = await design_blueprint(
            pipeline.learning_map, target,
            learner_state=learner_state, user_id="smoke",
            tuning=UserProfile(course_volume="systematic", focus="theory"),
        )
        print(f"    quick_scan sequence={len(quick.sequence)} · "
              f"systematic sequence={len(systematic.sequence)}")
        check(
            "volume steers sequence length (quick_scan < systematic)",
            len(quick.sequence) < len(systematic.sequence),
        )

        print(f"\n{'SOK 冒烟通过' if FAILURES == 0 else f'{FAILURES} 项失败'}")
        return FAILURES
    finally:
        shutdown_ai_runtime()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))