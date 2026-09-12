"""Free-Course smoke: the same code path across four unrelated domains.

Run from backend/ (the .env lives there):

    .venv/Scripts/python.exe scripts/smoke_free_course.py
    .venv/Scripts/python.exe scripts/smoke_free_course.py --dump out.json

Why these four: SAT Math / English writing / Calculus / Chaos theory share no
vocabulary, no language (one request is in English) and no structure. If the
engine needed per-domain tuning, one of them would break here.

Checks are invariants, not expected content (spec §18 Phase C) — they stay valid
as prompts evolve:
  - intent names a topic, and every assumption it made is explicit
  - map: 1..6 units, 1..6 lessons each, every lesson carries an objective
  - path: the next lesson exists in the map
  - blueprint: objective + at least 3 teaching beats
  - lesson: >=1 explanation, >=1 gradable practice/assessment, and every
    objective question's answer is one of its own options
It also prints the whole tree and the lesson outline, because "does it look like
a course a human would follow" is not something an assertion can answer.
"""

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path

# Windows consoles default to GBK here, which cannot encode the step markers or
# the Chinese model output. Force UTF-8 so the report is readable whatever the
# terminal is.
for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ai import init_ai_runtime, shutdown_ai_runtime  # noqa: E402
from ai.free_course import FreeCoursePipeline  # noqa: E402
from ai.free_course.types import Lesson  # noqa: E402

REQUESTS: list[tuple[str, str]] = [
    ("SAT 数学", "我想学习 SAT 数学，六周内把数学部分从 650 提到 750，需要真题级的解题技巧。"),
    ("英语写作", "我想系统学英语写作，目标是能写出清楚的学术段落，不追求文学性。"),
    ("微积分", "I want to learn calculus for university-level understanding."),
    ("混沌理论", "我对混沌理论很好奇，想知道它到底在说什么，能看懂科普书里的概念就行。"),
]


class Report:
    def __init__(self, label: str) -> None:
        self.label = label
        self.failures: list[str] = []

    def check(self, condition: bool, message: str) -> None:
        if not condition:
            self.failures.append(message)

    @property
    def ok(self) -> bool:
        return not self.failures


def check_lesson(report: Report, lesson: Lesson) -> None:
    kinds = [obj.kind for obj in lesson.objects]
    report.check("explanation" in kinds, "lesson has no explanation")
    report.check(
        "practice" in kinds or "assessment" in kinds,
        "lesson has no gradable interaction",
    )
    for obj in lesson.objects:
        if obj.kind not in ("practice", "assessment"):
            continue
        payload = obj.payload
        report.check(payload is not None, f"{obj.kind} '{obj.title}' has no payload")
        if payload is None:
            continue
        if payload.options:
            ids = {option.id for option in payload.options}
            report.check(
                payload.answer in ids,
                f"{obj.kind} '{obj.title}' answer is not one of its options",
            )
            report.check(
                len(ids) >= 2, f"{obj.kind} '{obj.title}' has fewer than 2 options"
            )
        else:
            report.check(
                bool(payload.expected),
                f"{obj.kind} '{obj.title}' has neither options nor expected answer",
            )


async def run_one(label: str, request: str, dump: dict) -> bool:
    print(f"\n{'=' * 78}\n{label}\n{'=' * 78}")
    print(f"请求：{request}")

    report = Report(label)
    pipeline = FreeCoursePipeline()
    started = time.monotonic()
    failed = None

    async for event in pipeline.stream(request):
        elapsed = time.monotonic() - started
        if event.status == "started":
            print(f"  [{elapsed:5.1f}s] … {event.step}")
        elif event.status == "finished":
            print(f"  [{elapsed:5.1f}s] ✓ {event.step}：{event.detail or ''}")
        else:
            failed = event
            print(
                f"  [{elapsed:5.1f}s] ✗ {event.step}：{event.error_code} {event.error_message}"
            )

    if failed or pipeline.product is None:
        report.check(False, f"pipeline failed at step {failed.step if failed else '?'}")
        print("  结果：FAILED")
        dump[label] = {"request": request, "failed": failed.model_dump() if failed else None}
        return False

    product = pipeline.product
    print(f"\n  产物耗时 {time.monotonic() - started:.1f}s\n")

    intent = product.intent
    print(f"  意图：{intent.topic}｜水平={intent.level or '未提'}｜深度={intent.depth or '未提'}")
    print(f"       期望：{intent.outcome}")
    if intent.assumptions:
        print("       假设：" + "；".join(intent.assumptions))
    report.check(bool(intent.topic.strip()), "intent has no topic")
    report.check(bool(intent.outcome.strip()), "intent has no outcome")

    learning_map = product.map
    print(f"\n  课程：{learning_map.title}（{learning_map.audience}）")
    for unit in learning_map.units:
        print(f"    · {unit.title}")
        for lesson in unit.lessons:
            print(f"        - {lesson.title}｜{lesson.objective}")
    report.check(1 <= len(learning_map.units) <= 6, f"unit count {len(learning_map.units)}")
    for unit in learning_map.units:
        report.check(
            1 <= len(unit.lessons) <= 6, f"unit '{unit.title}' lesson count {len(unit.lessons)}"
        )
        for lesson in unit.lessons:
            report.check(bool(lesson.objective.strip()), f"lesson '{lesson.title}' lacks objective")

    path = product.path
    titles = {lesson_title for _, lesson_title, _ in learning_map.flatten()}
    print(f"\n  路径：从「{path.next_lesson_title}」开始｜{path.rationale}")
    report.check(
        path.next_lesson_title in titles,
        f"next lesson '{path.next_lesson_title}' is not in the map",
    )

    blueprint = product.blueprint
    print(f"\n  蓝图（{blueprint.lesson_title}）：{blueprint.objective}")
    print(f"       前置：{'、'.join(blueprint.prerequisites) or '无'}")
    for index, beat in enumerate(blueprint.sequence, start=1):
        print(f"       {index}. {beat}")
    report.check(bool(blueprint.objective.strip()), "blueprint has no objective")
    report.check(len(blueprint.sequence) >= 3, "blueprint has fewer than 3 beats")

    lesson = product.lesson
    print(f"\n  第一节课：{lesson.title}（{len(lesson.objects)} 个对象）")
    for obj in lesson.objects:
        marker = {"explanation": "讲", "example": "例", "practice": "练", "assessment": "测"}[
            obj.kind
        ]
        answer = ""
        if obj.payload and obj.payload.answer:
            answer = f" 答案={obj.payload.answer}"
        elif obj.payload and obj.payload.expected:
            answer = " 开放题"
        print(f"    [{marker}] {obj.title}{answer}")
    check_lesson(report, lesson)

    dump[label] = {
        "request": request,
        "product": product.model_dump(mode="json"),
    }

    print(f"\n  结果：{'PASS' if report.ok else 'FAIL'}")
    for failure in report.failures:
        print(f"    ! {failure}")
    return report.ok


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dump", help="write the generated products as JSON")
    parser.add_argument("--only", help="substring of the label to run one case")
    args = parser.parse_args()

    init_ai_runtime()
    dump: dict = {}
    results: list[tuple[str, bool]] = []
    try:
        for label, request in REQUESTS:
            if args.only and args.only not in label:
                continue
            ok = await run_one(label, request, dump)
            results.append((label, ok))
    finally:
        await shutdown_ai_runtime()

    print(f"\n{'=' * 78}")
    for label, ok in results:
        print(f"  {'PASS' if ok else 'FAIL'}  {label}")
    print(f"{'=' * 78}")

    if args.dump:
        Path(args.dump).write_text(
            json.dumps(dump, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"  dump -> {args.dump}")

    return 0 if all(ok for _, ok in results) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
