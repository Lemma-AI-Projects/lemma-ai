"""Step 3 · gap + path: what the learner already has, and what comes next.

Two halves with different natures, kept in one module because the second is a
pure function of the first:

- ``assess_gap`` asks the model which map lessons are known / partial / unknown
  given the learner state (spec §4: simple reasoning, no adaptive algorithm).
- ``build_path`` is **deterministic Python** (spec §5): the order comes from the
  map, the skips come from the gap, and "next" is the first lesson the learner
  does not already have. The path therefore can never drift from the map, and it
  needs no table (it is recomputed from map + observations).
"""

from ai.client import ai_client
from ai.free_course.learner_state import describe
from ai.free_course.render import render_map
from ai.free_course.types import (
    GapItem,
    GapStatus,
    LearnerState,
    LearningGap,
    LearningIntent,
    LearningMap,
    LearningPath,
    PathStep,
)
from ai.types import AIUseCase

# Prefer a lesson-matching key that survives small wording drift; unit is the
# tiebreaker when two units reuse a lesson title (e.g. "练习").
_MAX_PREREQUISITES = 6


async def assess_gap(
    learning_map: LearningMap,
    *,
    learner_state: LearnerState | None = None,
    user_id: str | None = None,
) -> LearningGap:
    prompt = (
        f"学习地图：\n{render_map(learning_map)}\n\n"
        f"学习者信息：\n{describe(learner_state or LearnerState())}"
    )
    return await ai_client.generate(
        AIUseCase.FREE_COURSE_GAP, prompt, LearningGap, user_id=user_id
    )


def _key(unit_title: str, lesson_title: str) -> tuple[str, str]:
    return unit_title.strip().lower(), lesson_title.strip().lower()


def build_path(
    learning_map: LearningMap,
    gap: LearningGap,
    *,
    intent: LearningIntent,
) -> LearningPath:
    """Turn the gap verdict into an ordered path. Never invents lessons."""
    verdicts: dict[tuple[str, str], GapItem] = {}
    for item in gap.items:
        verdicts[_key(item.unit_title, item.lesson_title)] = item

    steps: list[PathStep] = []
    for unit_title, lesson_title, objective in learning_map.flatten():
        item = verdicts.get(_key(unit_title, lesson_title))
        status: GapStatus = item.status if item else "unknown"
        steps.append(
            PathStep(
                unit_title=unit_title,
                lesson_title=lesson_title,
                objective=objective,
                status=status,
                skipped=status == "known",
            )
        )

    # The starting point is monotone by construction: the learner may skip what
    # they already have, but never an unknown lesson. A model suggestion that
    # jumps ahead of the first unknown lesson is therefore ignored — the
    # suggestion can confirm the order, it cannot skip material.
    next_step = next((step for step in steps if not step.skipped), None)
    if next_step is None:
        # Everything known: still hand back a lesson rather than an empty course,
        # preferring the model's suggestion when it names a real one.
        suggested = next(
            (
                step
                for step in steps
                if gap.start_at
                and step.lesson_title.strip().lower() == gap.start_at.strip().lower()
            ),
            None,
        )
        next_step = suggested or (steps[0] if steps else None)

    prerequisites = [step.lesson_title for step in steps if step.skipped]
    return LearningPath(
        goal=intent.outcome,
        prerequisites=prerequisites[:_MAX_PREREQUISITES],
        steps=steps,
        next_lesson_title=next_step.lesson_title if next_step else None,
        rationale=gap.rationale,
    )
