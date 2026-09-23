"""Prompt-side rendering of Free-Course products.

Kept out of types.py so the product shapes stay pure data, and out of the step
modules so two steps cannot render the same thing differently.
"""

from ai.free_course.types import LearningMap, LessonBlueprint


def render_map(learning_map: LearningMap) -> str:
    """Indented unit -> lesson tree with objectives (what the LLM must reason
    over for the gap, the path and each blueprint)."""
    lines = [f"课程标题：{learning_map.title}", f"受众：{learning_map.audience}"]
    for unit_index, unit in enumerate(learning_map.units, start=1):
        lines.append(f"U{unit_index} {unit.title}：{unit.objective}")
        for lesson_index, lesson in enumerate(unit.lessons, start=1):
            lines.append(
                f"  L{unit_index}.{lesson_index} {lesson.title}：{lesson.objective}"
            )
    return "\n".join(lines)


def render_blueprint(blueprint: LessonBlueprint) -> str:
    """The blueprint as the content step receives it — nothing else is passed."""
    lines = [
        f"课程单元：{blueprint.unit_title}",
        f"本节：{blueprint.lesson_title}",
        f"学习目标：{blueprint.objective}",
    ]
    if blueprint.prerequisites:
        lines.append(f"前置：{'、'.join(blueprint.prerequisites)}")
    if blueprint.sequence:
        lines.append("教学序列：")
        lines.extend(
            f"  {index}. {beat}"
            for index, beat in enumerate(blueprint.sequence, start=1)
        )
    return "\n".join(lines)
