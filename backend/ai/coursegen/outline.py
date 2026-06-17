"""阶段一·大纲：topic + answers -> CourseOutline (one LLM call via the facade)."""

from ai.client import ai_client
from ai.coursegen.types import CourseOutline
from ai.types import AIUseCase


async def generate_outline(topic: str, answers: dict[str, str]) -> CourseOutline:
    """Design a course outline from the topic and the questionnaire profile.

    `answers` is a label -> choice mapping (Phase 4 decides the labels — question
    id or title). It is rendered into the prompt as the learner profile.
    """
    if answers:
        profile = "\n".join(f"- {key}: {value}" for key, value in answers.items())
    else:
        profile = "（未提供问卷答案）"
    prompt = f"学习主题：{topic}\n\n问卷画像：\n{profile}"
    return await ai_client.generate(AIUseCase.COURSE_OUTLINE, prompt, CourseOutline)
