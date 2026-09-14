"""Unit tests for the Free-Course persona contract (data pipeline stub).

Pure unit tests: no DB, no network, no model calls.
"""

import pytest

from ai.free_course.persona import (
    UserProfile,
    PromptInferredPersonaProvider,
    describe,
)
from ai.free_course.types import LearningIntent


def _intent(*, level: str | None = None) -> LearningIntent:
    return LearningIntent(
        raw_request="我想系统性地从零学泰语，目标是能看懂字幕",
        topic="泰语",
        outcome="能看懂泰语字幕",
        level=level,
    )


class TestUserProfileDefaults:
    def test_default_values_match_plan(self) -> None:
        profile = UserProfile()
        assert profile.level == "beginner"
        assert profile.course_volume == "standard"
        assert profile.depth == "derivation"
        assert profile.focus == "examples"
        assert profile.pace == "moderate"

    def test_optional_strings_default_to_none(self) -> None:
        profile = UserProfile()
        assert profile.why is None
        assert profile.outcome is None
        assert profile.time_budget is None

    def test_camel_case_alias_accepted(self) -> None:
        profile = UserProfile(
            courseVolume="systematic", timeBudget="两周"
        )
        assert profile.course_volume == "systematic"
        assert profile.time_budget == "两周"


class TestPromptInferredPersonaProvider:
    @pytest.mark.asyncio
    async def test_level_taken_from_intent(self) -> None:
        provider = PromptInferredPersonaProvider()

        intent = _intent(level="零基础")
        profile = await provider.get(user_id=None, intent=intent)
        assert profile.level == "零基础"

    @pytest.mark.asyncio
    async def test_level_falls_back_to_beginner_when_unsaid(self) -> None:
        provider = PromptInferredPersonaProvider()

        intent = _intent(level=None)
        profile = await provider.get(user_id=None, intent=intent)
        assert profile.level == "beginner"

    @pytest.mark.asyncio
    async def test_course_dimensions_default_on_stub(self) -> None:
        provider = PromptInferredPersonaProvider()

        intent = _intent()
        profile = await provider.get(user_id=None, intent=intent)
        assert profile.course_volume == "standard"
        assert profile.depth == "derivation"
        assert profile.focus == "examples"
        assert profile.pace == "moderate"


class TestDescribe:
    def test_renders_header_and_four_dimensions(self) -> None:
        text = describe(UserProfile())
        assert "# User profile (inferred)" in text
        assert "- course_volume: standard" in text
        assert "- depth: derivation" in text
        assert "- focus: examples" in text
        assert "- pace: moderate" in text
        assert text  # non-empty

    def test_includes_filled_optional_strings(self) -> None:
        text = describe(
            UserProfile(
                why="工作需要",
                outcome="能看懂字幕",
                time_budget="每天一小时",
            )
        )
        assert "- why: 工作需要" in text
        assert "- outcome: 能看懂字幕" in text
        assert "- time_budget: 每天一小时" in text