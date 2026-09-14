"""Learner persona — the data gradient behind generation (spec §3).

``LearnerStateProvider`` (learner_state.py) answers "what do we know about this
learner NOW", and this module answers "who is this learner as a persona" — the
stable preferences and disposition (course volume, depth, focus, pace) shaped
from the pending intent.

Two seams, same discipline as learner_state: pure pydantic, no DB / no model,
and every implementation swaps behind the same :class:`PersonaProvider`
interface without the pipeline knowing.

Reading order for a fresh maintainer: :class:`UserProfile` (the shape) ->
:class:`PersonaProvider` (the swap point) -> :class:`PromptInferredPersonaProvider`
(the dumb stub) -> :func:`describe` (how it renders for a prompt).
"""

from typing import Literal, Protocol

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from ai.free_course.types import LearningIntent

CourseVolume = Literal["quick_scan", "standard", "systematic"]
Depth = Literal["intuition", "derivation", "advanced"]
Focus = Literal["concepts", "examples", "applied", "theory"]
Pace = Literal["relaxed", "moderate", "intensive"]


class UserProfile(BaseModel):
    """Persona shape. Optional strings carry what the learner said; the four
    course dimensions always carry a sane default so downstream prompt
    rendering is shape-constant before any real persona data exists."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    level: str = "beginner"
    why: str | None = None
    outcome: str | None = None
    time_budget: str | None = None
    course_volume: CourseVolume = "standard"
    depth: Depth = "derivation"
    focus: Focus = "examples"
    pace: Pace = "moderate"


class PersonaProvider(Protocol):
    """One method. Richer providers add inputs, not call sites."""

    async def get(
        self, *, user_id: str | None, intent: LearningIntent
    ) -> UserProfile: ...


class PromptInferredPersonaProvider:
    """stub：数据代跑。level 取 intent 自报，4 个课程维度按意图原话推断到默认档。
    真画像落地时换实现（读图存储/用户表），契约与下游零改动。"""

    async def get(
        self, *, user_id: str | None, intent: LearningIntent
    ) -> UserProfile:
        return UserProfile(level=intent.level or "beginner")


def describe(profile: UserProfile) -> str:
    """渲染进提示词；与 learner_state.describe 同规约：空给一行，形状恒定。"""
    lines = [
        "# User profile (inferred)",
        f"- level: {profile.level}",
        f"- course_volume: {profile.course_volume}",
        f"- depth: {profile.depth}",
        f"- focus: {profile.focus}",
        f"- pace: {profile.pace}",
    ]
    if profile.why:
        lines.append(f"- why: {profile.why}")
    if profile.outcome:
        lines.append(f"- outcome: {profile.outcome}")
    if profile.time_budget:
        lines.append(f"- time_budget: {profile.time_budget}")
    return "\n".join(lines)