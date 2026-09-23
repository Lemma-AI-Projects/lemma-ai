"""Step 2 · structure: LearningIntent -> LearningMap (the course tree).

Bounded on purpose (spec §2): the map answers "what should this learner
encounter, and in roughly what order", not "what is everything knowable about
this field". Caps are enforced here, after the model call — a course that blows
past them is trimmed, not rejected, because the learner still needs a course.
"""

from ai.client import ai_client
from ai.errors import FreeCourseError
from ai.free_course.sources import SourceMaterial
from ai.free_course.types import (
    MAX_LESSONS_PER_UNIT,
    MAX_UNITS,
    LearnerState,
    LearningIntent,
    LearningMap,
    MapLesson,
    MapUnit,
)
from ai.free_course.learner_state import describe
from ai.types import AIUseCase


async def structure(
    intent: LearningIntent,
    *,
    learner_state: LearnerState | None = None,
    material: SourceMaterial | None = None,
    user_id: str | None = None,
) -> LearningMap:
    prompt = (
        f"学习意图：\n"
        f"- 主题：{intent.topic}\n"
        f"- 动机：{intent.why or '（未说明）'}\n"
        f"- 期望结果：{intent.outcome}\n"
        f"- 水平：{intent.level or '（未说明）'}\n"
        f"- 可投入时间：{intent.time_budget or '（未说明）'}\n"
        f"- 深度要求：{intent.depth or '（未说明）'}\n"
        f"- 其它约束：{'、'.join(intent.constraints) or '（无）'}\n\n"
        f"学习者信息：\n{describe(learner_state or LearnerState())}\n\n"
        f"可用资料：\n{(material or SourceMaterial()).to_prompt_block()}"
    )
    learning_map = await ai_client.generate(
        AIUseCase.FREE_COURSE_MAP, prompt, LearningMap, user_id=user_id
    )
    return _bound(learning_map)


def _bound(learning_map: LearningMap) -> LearningMap:
    """Trim to the caps and refuse a map with nothing learnable in it."""
    title = learning_map.title.strip() or "未命名课程"
    units: list[MapUnit] = []
    for unit in learning_map.units[:MAX_UNITS]:
        unit_title = unit.title.strip()
        if not unit_title:
            continue
        lessons: list[MapLesson] = []
        for lesson in unit.lessons[:MAX_LESSONS_PER_UNIT]:
            lesson_title = lesson.title.strip()
            if not lesson_title:
                continue
            lessons.append(
                MapLesson(
                    title=lesson_title,
                    objective=lesson.objective.strip() or lesson_title,
                )
            )
        if not lessons:
            # A unit with no lessons is a heading, not a unit.
            continue
        units.append(
            MapUnit(
                title=unit_title,
                objective=unit.objective.strip() or unit_title,
                lessons=lessons,
            )
        )
    if not units:
        raise FreeCourseError("map has no usable unit/lesson")
    return LearningMap(
        title=title,
        audience=learning_map.audience.strip() or "希望系统学习该主题的学习者",
        summary=learning_map.summary.strip(),
        units=units,
    )
