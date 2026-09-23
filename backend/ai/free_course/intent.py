"""Step 1 · understand: one free-text learning request -> LearningIntent."""

from ai.client import ai_client
from ai.free_course.learner_state import describe
from ai.free_course.types import LearnerState, LearningIntent
from ai.types import AIUseCase


async def understand(
    request: str,
    *,
    learner_state: LearnerState | None = None,
    user_id: str | None = None,
) -> LearningIntent:
    """Parse the learner's request.

    Everything the learner did not say becomes an explicit assumption rather
    than a question (spec §2): the flow must feel like "tell me what you want to
    learn", not "complete your profile".
    """
    prompt = (
        f"学习请求（学习者原话）：\n{request}\n\n"
        f"系统已掌握的学习者信息：\n"
        f"{describe(learner_state or LearnerState())}"
    )
    intent = await ai_client.generate(
        AIUseCase.FREE_COURSE_INTAKE, prompt, LearningIntent, user_id=user_id
    )
    # The learner's own words are data, not a model output: never let a paraphrase
    # become the stored original (the refine step re-reads it verbatim).
    return intent.model_copy(update={"raw_request": request})
