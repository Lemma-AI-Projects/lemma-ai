"""Step 4 · blueprint: the boundary between planning and writing.

The content step receives a :class:`LessonBlueprint` — never the raw request
(spec §6). That is the whole point of this module: it is small, it is the only
thing the writer sees, and it is what a human would edit if the blueprint needed
changing.
"""

from ai.client import ai_client
from ai.free_course.learner_state import describe
from ai.free_course.persona import UserProfile, describe as describe_profile
from ai.free_course.types import (
    LearnerState,
    LearningMap,
    LessonBlueprint,
    PathStep,
)
from ai.types import AIUseCase

_MAX_SEQUENCE = 8
_MAX_PREREQUISITES = 5

# Lesson-sequence length per chosen course volume. The map's scale (how many
# units/lessons) is fixed in Structure — volume only budgets how much beats a
# single lesson can carry.
_VOLUME_SEQUENCE_CAP = {
    "quick_scan": 4,
    "standard": 6,
    "systematic": _MAX_SEQUENCE,
}


async def design_blueprint(
    learning_map: LearningMap,
    step: PathStep,
    *,
    learner_state: LearnerState | None = None,
    user_id: str | None = None,
    tuning: UserProfile | None = None,
) -> LessonBlueprint:
    """Design one lesson from its map slot."""
    unit_lessons = next(
        (
            unit.lessons
            for unit in learning_map.units
            if unit.title == step.unit_title
        ),
        [],
    )
    siblings = "\n".join(
        f"- {lesson.title}：{lesson.objective}" for lesson in unit_lessons
    )
    prompt = (
        f"课程：{learning_map.title}\n"
        f"受众：{learning_map.audience}\n"
        f"所属单元：{step.unit_title}\n"
        f"本单元其它节：\n{siblings or '（本节为单元首节）'}\n\n"
        f"本节课：{step.lesson_title}\n"
        f"学习目标：{step.objective}\n\n"
        f"学习者信息：\n{describe(learner_state or LearnerState())}"
    )
    if tuning is not None:
        prompt += "\n\n" + describe_profile(tuning)
        prompt += f"\n内容侧重：请重点编排 {_focus_phrase(tuning.focus)}"
    blueprint = await ai_client.generate(
        AIUseCase.FREE_COURSE_BLUEPRINT, prompt, LessonBlueprint, user_id=user_id
    )
    return _bound(blueprint, step, tuning=tuning)


def _focus_phrase(focus: str) -> str:
    return {
        "concepts": "核心概念与直觉",
        "examples": "实例与练习",
        "applied": "实际应用场景",
        "theory": "理论推导",
    }.get(focus, focus)


def _bound(
    blueprint: LessonBlueprint, step: PathStep, *, tuning: UserProfile | None
) -> LessonBlueprint:
    """Keep the blueprint honest: it names the lesson it was asked to design."""
    sequence = [beat.strip() for beat in blueprint.sequence if beat.strip()]
    prerequisites = [item.strip() for item in blueprint.prerequisites if item.strip()]
    cap = _sequence_cap(tuning)
    return LessonBlueprint(
        # The map owns unit/lesson identity; a renamed lesson would break the
        # path it was derived from.
        unit_title=step.unit_title,
        lesson_title=step.lesson_title,
        objective=blueprint.objective.strip() or step.objective,
        prerequisites=prerequisites[:_MAX_PREREQUISITES],
        sequence=sequence[:cap],
    )


def _sequence_cap(tuning: UserProfile | None) -> int:
    if tuning is None:
        return _MAX_SEQUENCE
    return _VOLUME_SEQUENCE_CAP.get(tuning.course_volume, _MAX_SEQUENCE)
