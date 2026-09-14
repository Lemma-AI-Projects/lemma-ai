"""Unit tests for the Free-Course pipeline `stop_at` checkpoint.

Pure unit tests: no DB, no network, no model calls. The pipeline's model
calls are monkeypatched at ``ai.free_course.pipeline`` module level so the
flow can be pushed deterministic-ly through ``intent -> map -> path`` and,
for the default path, on through ``blueprint -> content -> done``.
"""

import pytest

import ai.free_course.pipeline as pipeline
from ai.free_course.learner_state import NullLearnerStateProvider
from ai.free_course.pipeline import FreeCoursePipeline
from ai.free_course.sources import SourceMaterial
from ai.free_course.types import (
    LearningGap,
    LearningIntent,
    LearningMap,
    Lesson,
    LessonBlueprint,
    MapLesson,
    MapUnit,
)

REQUEST = "我想系统性地从零学泰语，目标是能看懂字幕"
LESSON_TITLE = "泰语发音入门"


def _intent(*, level: str | None = None) -> LearningIntent:
    return LearningIntent(
        raw_request=REQUEST,
        topic="泰语",
        outcome="能看懂泰语字幕",
        level=level,
    )


def _map() -> LearningMap:
    return LearningMap(
        title="零基础泰语",
        audience="希望系统学习泰语的学习者",
        summary="从发音到理解字幕",
        units=[
            MapUnit(
                title="泰语基础",
                objective="掌握基础发音",
                lessons=[MapLesson(title=LESSON_TITLE, objective="掌握声母韵母")],
            )
        ],
    )


def _gap() -> LearningGap:
    return LearningGap(items=[], start_at=None, rationale="测试")


def _blueprint() -> LessonBlueprint:
    return LessonBlueprint(
        unit_title="泰语基础",
        lesson_title=LESSON_TITLE,
        objective="掌握声母韵母",
        sequence=["讲解", "练习"],
    )


def _lesson() -> Lesson:
    return Lesson(title=LESSON_TITLE, objective="掌握声母韵母", objects=[])


@pytest.fixture
def model_mocks(monkeypatch):
    """Swap every model call in the pipeline for deterministic doubles.

    Design/lesson are included so a broken `stop_at="path"` fails loudly
    (the real calls would otherwise try to hit the network) instead of just
    being "not reached".
    """
    calls = {"design_blueprint": 0, "generate_lesson": 0}

    async def fake_understand(request, *, user_id=None):
        return _intent()

    async def fake_collect_sources(intent, sources, **kwargs):
        return SourceMaterial()

    async def fake_structure(intent, *, learner_state=None, material=None, user_id=None):
        return _map()

    async def fake_assess_gap(learning_map, *, learner_state=None, user_id=None):
        return _gap()

    async def fake_design_blueprint(
        learning_map, step, *, learner_state=None, user_id=None
    ):
        calls["design_blueprint"] += 1
        return _blueprint()

    async def fake_generate_lesson(blueprint, *, material=None, user_id=None):
        calls["generate_lesson"] += 1
        return _lesson()

    monkeypatch.setattr(pipeline, "understand", fake_understand)
    monkeypatch.setattr(pipeline, "collect_sources", fake_collect_sources)
    monkeypatch.setattr(pipeline, "structure", fake_structure)
    monkeypatch.setattr(pipeline, "assess_gap", fake_assess_gap)
    monkeypatch.setattr(pipeline, "design_blueprint", fake_design_blueprint)
    monkeypatch.setattr(pipeline, "generate_lesson", fake_generate_lesson)
    return calls


async def _collect(pipeline) -> list:
    events = []
    async for event in pipeline.stream(REQUEST, user_id=None):
        events.append(event)
    return events


def _steps(events) -> list[str]:
    return [e.step for e in events if e.status == "finished"]


class TestStopAtPath:
    @pytest.mark.asyncio
    async def test_stop_at_path_stops_before_blueprint(self, model_mocks) -> None:
        p = FreeCoursePipeline(
            learner_state_provider=NullLearnerStateProvider(),
            sources=[],
            stop_at="path",
        )
        events = await _collect(p)

        steps = _steps(events)
        assert steps == ["intent", "map", "path"]
        # The early return must suppress the remaining steps entirely.
        executed = [e.step for e in events]
        assert "blueprint" not in executed
        assert "content" not in executed
        assert "done" not in executed
        # Phase 1 leaves the resume handles populated, but no product yet.
        assert p.intent is not None
        assert p.learning_map is not None
        assert p.product is None
        # None of the downstream model fns may be invoked.
        assert model_mocks["design_blueprint"] == 0
        assert model_mocks["generate_lesson"] == 0


class TestDefaultStopAtAll:
    @pytest.mark.asyncio
    async def test_default_stop_at_all_still_runs_full(self, model_mocks) -> None:
        p = FreeCoursePipeline(
            learner_state_provider=NullLearnerStateProvider(),
            sources=[],
        )
        events = await _collect(p)

        steps = _steps(events)
        assert steps[:3] == ["intent", "map", "path"]
        assert "blueprint" in steps
        assert "content" in steps
        assert steps[-1] == "done"
        assert model_mocks["design_blueprint"] == 1
        assert model_mocks["generate_lesson"] == 1
        assert p.product is not None