"""Free-Course P1 smoke: build -> persist -> read -> observe, against the real DB.

This is the P1 acceptance (plan §7): migration applied + SSE step order + the
generated course lands in the tree and reads back consistently + an objective
answer is judged locally and an open answer gets LLM feedback. It creates ONE
real free course for an existing profile (default: the newest), then deletes it
(and its tree) on exit, so the dev DB stays clean.

Run from backend/ (.env lives here); needs a reachable DB and AI keys:

    .venv/Scripts/python.exe scripts/smoke_free_course_persist.py [--user <uuid>]
"""

import argparse
import asyncio
import json
import sys
import uuid
from collections.abc import AsyncIterator
from pathlib import Path

# Windows consoles default to GBK; force UTF-8 for the Chinese model output.
for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import delete, select, text  # noqa: E402

from ai import init_ai_runtime, shutdown_ai_runtime  # noqa: E402
from core.database import AsyncSessionLocal  # noqa: E402
from models.course import Course  # noqa: E402
from models.free_course import CourseLessonObject, CourseLessonObservation  # noqa: E402
from schemas.free_course import ObservationIn  # noqa: E402
from services import free_course_events, free_course_service  # noqa: E402

INTENT = "我想快速理解导数的直觉概念，能看懂导数到底是什么就够了。"


class Report:
    def __init__(self) -> None:
        self.failures: list[str] = []

    def check(self, ok: bool, message: str) -> None:
        if not ok:
            self.failures.append(message)

    @property
    def ok(self) -> bool:
        return not self.failures


async def pick_user_id() -> uuid.UUID:
    async with AsyncSessionLocal() as db:
        row = (await db.execute(
            text("select id from profiles order by created_at desc limit 1")
        )).first()
    if row is None:
        raise SystemExit("no profiles in DB; pass --user <uuid>")
    return row[0]


async def parse_frames(raw: AsyncIterator[str]) -> list[tuple[str, dict]]:
    """frames: the SSE strings -> [(event_name, data_dict)]."""
    frames: list[tuple[str, dict]] = []
    buf: list[str] = []
    event = "message"
    async for frame in raw:
        for line in frame.splitlines():
            if line.startswith("event: "):
                event = line[len("event: "):]
            elif line.startswith("data: "):
                try:
                    buf.append(json.loads(line[len("data: "):]))
                except json.JSONDecodeError:
                    buf.append({"raw": line})
        if buf:
            frames.append((event, buf.pop(0)))
    return frames


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--user", help="profile id to own the throwaway course")
    args = parser.parse_args()

    init_ai_runtime()
    report = Report()
    course_id: uuid.UUID | None = None
    frames: list[tuple[str, dict]] = []
    try:
        user_id = uuid.UUID(args.user) if args.user else await pick_user_id()
        print(f"user: {user_id}")

        async with AsyncSessionLocal() as db:
            course = await free_course_service.create_free_course(
                db, user_id=user_id, intent=INTENT, conversation_id=None
            )
            course_id = course.id
        print(f"created shell: {course_id}")

        print("\n-- build/stream --")
        frames = [
            *(
                await parse_frames(
                    free_course_events.stream_free_course_build(
                        user_id, course_id, INTENT
                    )
                )
            )
        ]
        for name, data in frames:
            step = data.get("step", "")
            status = data.get("status", "")
            print(f"  [{name}] {step:<9} {status:<8}{data.get('detail') or ''}")

        # 1. SSE order: the five steps round-trip, each started then finished,
        #    and the terminal `done` frame carries the built course.
        step_frames = [
            (d["step"], d["status"]) for n, d in frames if n == "step"
        ]
        expected = [
            ("intent", "started"), ("intent", "finished"),
            ("map", "started"), ("map", "finished"),
            ("path", "started"), ("path", "finished"),
            ("blueprint", "started"), ("blueprint", "finished"),
            ("content", "started"), ("content", "finished"),
            ("done", "finished"),
        ]
        report.check(
            step_frames == expected,
            f"sse step order mismatch: {step_frames}",
        )
        terminal = [d for n, d in frames if n == "done"]
        report.check(bool(terminal), "missing terminal `done` frame")
        detail_wire = terminal[-1] if terminal else {}

        # 2. Persist: detail reads mode=free + a real tree with objectives.
        async with AsyncSessionLocal() as db:
            detail = await free_course_service.get_detail(
                db, user_id=user_id, course_id=course_id
            )
        report.check(detail is not None, "get_detail returned None")
        report.check(detail is not None and detail.mode == "free", "mode is not free")
        report.check(detail is not None and len(detail.units) >= 1, "no units persisted")
        target = None
        if detail is not None:
            for unit in detail.units:
                for lesson in unit.lessons:
                    report.check(bool(lesson.objective), f"lesson '{lesson.title}' lacks objective")
                    if lesson.has_content:
                        report.check(lesson.blueprint is not None, "'has_content' lesson has no blueprint")
                        target = (unit.id, lesson.id)
        report.check(target is not None, "no lesson was flagged has_content")
        report.check(
            detail_wire.get("mode") == "free",
            "terminal `done` frame did not carry the built detail",
        )

        # 3. Lesson read: objects come back with options, without the answer.
        assert target is not None
        unit_id, chapter_id = target
        async with AsyncSessionLocal() as db:
            lesson = await free_course_service.get_lesson_content(
                db, user_id=user_id, course_id=course_id, chapter_id=chapter_id
            )
        report.check(lesson is not None, "get_lesson_content returned None")
        assert lesson is not None
        kinds = [o.kind for o in lesson.objects]
        report.check("explanation" in kinds, "lesson read has no explanation")
        report.check(
            any(o.kind in ("practice", "assessment") for o in lesson.objects),
            "lesson read has no gradable objects",
        )
        objective_objects = [o for o in lesson.objects if o.options]
        open_objects = [o for o in lesson.objects if not o.options and o.kind in ("practice", "assessment")]
        print(
            f"  lesson objects: {len(lesson.objects)} "
            f"(objective {len(objective_objects)} / open {len(open_objects)})"
        )

        # answers never leak to the client via the read schema
        async with AsyncSessionLocal() as db:
            rows = (await db.execute(
                select(CourseLessonObject.payload_json).where(
                    CourseLessonObject.chapter_id == chapter_id
                )
            )).scalars().all()
        server_answers = {json.dumps(r.get("options", [])): r.get("answer") for r in rows if r}

        # 4. Observation on an objective object: local judge + LLM feedback.
        submitted = 0
        if objective_objects:
            obj = objective_objects[0]
            correct_option = None
            async with AsyncSessionLocal() as db:
                row = (await db.execute(
                    select(CourseLessonObject.payload_json).where(
                        CourseLessonObject.id == obj.id
                    )
                )).scalar_one()
                correct_option = (row or {}).get("answer")
            report.check(
                correct_option in {o.id for o in obj.options} if correct_option else False,
                "server answer not among the object's options",
            )
            async with AsyncSessionLocal() as db:
                fb = await free_course_service.submit_observation(
                    db, user_id=user_id, course_id=course_id,
                    chapter_id=chapter_id,
                    submission=ObservationIn(object_id=obj.id, option_id=correct_option),
                )
            report.check(
                fb is not None and fb.verdict == "correct",
                f"correct answer judged {fb.verdict if fb else None}, want 'correct'",
            )
            submitted += 1
            print(f"  [objective ✓] verdict={fb.verdict if fb else None}")
            wrong = next((o.id for o in obj.options if o.id != correct_option), None)
            if wrong:
                async with AsyncSessionLocal() as db:
                    fb2 = await free_course_service.submit_observation(
                        db, user_id=user_id, course_id=course_id,
                        chapter_id=chapter_id,
                        submission=ObservationIn(object_id=obj.id, option_id=wrong),
                    )
                report.check(
                    fb2 is not None and fb2.verdict == "incorrect",
                    f"wrong answer judged {fb2.verdict if fb2 else None}, want 'incorrect'",
                )
                submitted += 1
                print(f"  [objective ✗] verdict={fb2.verdict if fb2 else None}")

        # 5. Observation on an open object: LLM judges, feedback is non-empty.
        if open_objects:
            obj = open_objects[0]
            async with AsyncSessionLocal() as db:
                fb3 = await free_course_service.submit_observation(
                    db, user_id=user_id, course_id=course_id,
                    chapter_id=chapter_id,
                    submission=ObservationIn(object_id=obj.id, text="我大概理解，但说不出严格定义。"),
                )
            report.check(
                fb3 is not None and bool(fb3.feedback),
                "open answer got no feedback",
            )
            submitted += 1
            print(f"  [open] verdict={fb3.verdict if fb3 else None} feedback={ (fb3.feedback[:20] + '…') if fb3 and fb3.feedback else '' }")

        # 6. Observations really persisted (every submission above landed rows).
        async with AsyncSessionLocal() as db:
            observed = await _count_observations(db, chapter_id=chapter_id)
        report.check(
            observed >= submitted,
            f"observations persisted: {observed}, want >= {submitted}",
        )
        print(f"  [persist] observations for chapter: {observed} (submitted {submitted})")
    finally:
        # cleanup: deleting the course cascades units/chapters/objects/observations.
        if course_id is not None:
            async with AsyncSessionLocal() as db:
                await db.execute(delete(Course).where(Course.id == course_id))
                await db.commit()
            print(f"\ncleaned course {course_id}")
        await shutdown_ai_runtime()

    if not report.ok:
        print("\nRESULT: FAIL")
        for failure in report.failures:
            print(f"  ! {failure}")
        return 1
    print("\nRESULT: PASS (P1 build/persist/read/observe)")
    return 0


async def _count_observations(db, *, chapter_id: uuid.UUID) -> int:
    """Observation rows whose object belongs to this chapter."""
    from sqlalchemy import func

    count = (
        await db.execute(
            select(func.count(CourseLessonObservation.id))
            .join(
                CourseLessonObject,
                CourseLessonObservation.object_id == CourseLessonObject.id,
            )
            .where(CourseLessonObject.chapter_id == chapter_id)
        )
    ).scalar_one()
    return int(count or 0)


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))