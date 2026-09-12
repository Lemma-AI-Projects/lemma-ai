"""Learner state — the other reserved interface (spec §3).

Free-Course **consumes** learner information; it does not own it. Nothing in
this module reads a database or calls a model, and nothing here is a learner
model: it is a shape plus one dumb implementation.

The swap point is explicit. ``services/free_course_service`` reads whatever it
can (self-reported level from earlier intents, how many observations this
learner has produced) and hands it to :class:`BasicLearnerStateProvider`. When
the real learner layer (掌握度/σ, currently on `main` and not merged into this
branch) lands, a provider that reads it replaces this one behind the same
:class:`LearnerStateProvider` interface — the pipeline is untouched.

Not built on purpose: no knowledge graph, no cognition/metacognition/affect
dimensions, no per-concept mastery table. The interface is where those would
arrive; the MVP does not pretend to have them.
"""

from typing import Protocol, runtime_checkable

from ai.free_course.types import LearnerState, LearningIntent


@runtime_checkable
class LearnerStateProvider(Protocol):
    """One method. Richer providers add inputs, not call sites."""

    async def get(
        self, *, user_id: str | None, intent: LearningIntent
    ) -> LearnerState: ...


class NullLearnerStateProvider:
    """Knows nothing. Used when the caller has no learner information at all."""

    async def get(
        self, *, user_id: str | None, intent: LearningIntent
    ) -> LearnerState:
        return LearnerState()


class BasicLearnerStateProvider:
    """MVP provider: a pure function of what the caller already read.

    Self-reported level, topic hints and the observation count are passed in,
    because this package must not touch the database. The intent's own level
    hint is the fallback when nothing was reported — the learner usually says
    "零基础" or "大学水平" in the request itself, and that is real information.
    """

    def __init__(
        self,
        *,
        self_reported_level: str | None = None,
        known_topics: list[str] | None = None,
        weak_topics: list[str] | None = None,
        observed_attempts: int = 0,
        notes: list[str] | None = None,
    ) -> None:
        self._self_reported_level = self_reported_level
        self._known_topics = list(known_topics or [])
        self._weak_topics = list(weak_topics or [])
        self._observed_attempts = observed_attempts
        self._notes = list(notes or [])

    async def get(
        self, *, user_id: str | None, intent: LearningIntent
    ) -> LearnerState:
        return LearnerState(
            self_reported_level=self._self_reported_level or intent.level,
            known_topics=self._known_topics,
            weak_topics=self._weak_topics,
            observed_attempts=self._observed_attempts,
            notes=self._notes,
        )


def describe(learner_state: LearnerState) -> str:
    """Render learner state for a prompt. Empty state renders a single honest
    line so the prompt shape is identical with and without learner data."""
    if learner_state.is_empty():
        return "（暂无学习者信息：按零基础到目标水平的常规路径设计）"
    lines: list[str] = []
    if learner_state.self_reported_level:
        lines.append(f"- 自报水平：{learner_state.self_reported_level}")
    if learner_state.known_topics:
        lines.append(f"- 已掌握：{'、'.join(learner_state.known_topics)}")
    if learner_state.weak_topics:
        lines.append(f"- 薄弱：{'、'.join(learner_state.weak_topics)}")
    if learner_state.observed_attempts:
        lines.append(f"- 本课程已完成作答：{learner_state.observed_attempts} 次")
    lines.extend(f"- {note}" for note in learner_state.notes)
    return "\n".join(lines)
