"""Unit tests for the Free-Course questionnaire tuning wire schemas.

Pure unit tests: no DB, no network, no model calls.
"""

import pytest
from pydantic import ValidationError

from schemas.free_course import (
    CourseTuningIn,
    CourseTuningQuestionOut,
    CourseTuningStartOut,
)


class TestCourseTuningInDefaults:
    def test_all_dimensions_default_to_none_and_skip_false(self) -> None:
        payload = CourseTuningIn()
        assert payload.volume is None
        assert payload.depth is None
        assert payload.focus is None
        assert payload.pace is None
        assert payload.skip is False

    def test_accepts_valid_values_and_round_trips(self) -> None:
        payload = CourseTuningIn(volume="systematic", skip=False)
        assert payload.volume == "systematic"
        assert payload.skip is False
        dumped = payload.model_dump()
        assert dumped["volume"] == "systematic"
        assert dumped["depth"] is None
        assert dumped["skip"] is False

    def test_rejects_invalid_volume(self) -> None:
        with pytest.raises(ValidationError):
            CourseTuningIn(volume="huge")


class TestCourseTuningQuestionOut:
    def test_options_default_to_empty_list(self) -> None:
        q = CourseTuningQuestionOut(key="course_volume", title="体量")
        assert q.options == []


class TestCourseTuningStartOut:
    def test_round_trip_with_camel_alias_keys(self) -> None:
        defaults = {
            "level": "beginner",
            "courseVolume": "quick_scan",
            "depth": "intuition",
            "focus": "concepts",
            "pace": "relaxed",
        }
        questions = [
            CourseTuningQuestionOut(
                key="course_volume",
                title="体量",
                options=[{"value": "quick_scan", "label": "轻量速览"}],
            )
        ]
        payload = CourseTuningStartOut(defaults=defaults, questions=questions)

        dumped = payload.model_dump(by_alias=True)
        # top-level and question keys serialize camelCase
        assert "defaults" in dumped
        assert "questions" in dumped
        q_dumped = dumped["questions"][0]
        assert q_dumped["key"] == "course_volume"
        assert q_dumped["title"] == "体量"
        assert q_dumped["options"] == [
            {"value": "quick_scan", "label": "轻量速览"}
        ]

    def test_questions_default_to_empty_list(self) -> None:
        payload = CourseTuningStartOut(defaults={})
        assert payload.questions == []