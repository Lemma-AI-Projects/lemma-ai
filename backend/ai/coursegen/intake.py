"""阶段一·问卷：topic -> Questionnaire (one LLM call via the ai/ facade)."""

from ai.client import ai_client
from ai.coursegen.types import Questionnaire
from ai.types import AIUseCase


async def generate_questionnaire(
    topic: str, known_profile: dict[str, str] | None = None
) -> Questionnaire:
    """Profile-discovery questionnaire for a learning request. known_profile, if
    given, is what we already know (so the LLM can skip those questions)."""
    prompt = f"学习诉求：{topic}"
    if known_profile:
        known = "\n".join(f"- {key}: {value}" for key, value in known_profile.items())
        prompt = f"{prompt}\n\n已知画像（无需重复提问）：\n{known}"
    return await ai_client.generate(AIUseCase.COURSE_INTAKE, prompt, Questionnaire)
