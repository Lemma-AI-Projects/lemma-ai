"""Unit tests for blueprint tuning: volume caps the sequence, focus steers it.

Pure unit tests: no DB, no network, no model calls. ``_bound`` own the only
post-processing that tuning changes, so it is tested directly along with the cap
helper. ``design_blueprint``'s prompt injection is exercised by the acceptance
path (questionnaire -> phase 2), not here.
"""

import pytest

from ai.free_course.blueprint import _sequence_cap
from ai.free_course.persona import UserProfile
from ai.free_course.types import LessonBlueprint, PathStep

_FULL = [f"环节 {i}" for i in range(1, 10)]  # 9 beats > every cap


def _blueprint(*, sequence: list[str] | None = None) -> LessonBlueprint:
    return LessonBlueprint(
        unit_title="泰语基础",
        lesson_title="发音入门",
        objective="掌握声母韵母",
        sequence=sequence or _FULL,
    )


def _step() -> PathStep:
    return PathStep(
        unit_title="泰语基础",
        lesson_title="发音入门",
        objective="掌握声母韵母",
        status="unknown",
    )


class TestSequenceCap:
    def test_no_tuning_keeps_full_default(self) -> None:
        assert _sequence_cap(None) == 8

    def test_volume_scales_the_cap(self) -> None:
        assert _sequence_cap(UserProfile(course_volume="quick_scan")) == 4
        assert _sequence_cap(UserProfile(course_volume="standard")) == 6
        assert _sequence_cap(UserProfile(course_volume="systematic")) == 8


class TestBoundSequence:
    def test_probes_default_cap_at_8(self) -> None:
        # Import inside the test to avoid touching ai_client at module load.
        from ai.free_course.blueprint import _bound

        result = _bound(_blueprint(), _step(), tuning=None)
        assert len(result.sequence) == 8

    def test_quick_scan_caps_sequence_at_4(self) -> None:
        from ai.free_course.blueprint import _bound

        result = _bound(
            _blueprint(),
            _step(),
            tuning=UserProfile(course_volume="quick_scan"),
        )
        assert len(result.sequence) == 4

    def test_systematic_keeps_up_to_8(self) -> None:
        from ai.free_course.blueprint import _bound

        result = _bound(
            _blueprint(),
            _step(),
            tuning=UserProfile(course_volume="systematic"),
        )
        assert len(result.sequence) == 8

    def test_identity_preserved_under_tuning(self) -> None:
        from ai.free_course.blueprint import _bound

        result = _bound(
            _blueprint(),
            _step(),
            tuning=UserProfile(course_volume="quick_scan", focus="theory"),
        )
        assert result.unit_title == "泰语基础"
        assert result.lesson_title == "发音入门"
        assert result.objective == "掌握声母韵母"