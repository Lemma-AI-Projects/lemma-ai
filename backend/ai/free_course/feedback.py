"""Feedback: explain one answer back to the learner.

Verdict policy (拍板 5: 客观题本地判定 + LLM 反馈):

- objective questions (the object has options) — the **service** decides the
  verdict by comparing option ids, and passes it in; the model only explains why,
  so a model hiccup can never turn a right answer into a wrong one.
- open questions — the model decides against ``payload.expected``.

`FeedbackUnavailable` is returned instead of raising when the model call fails:
losing the explanation is annoying, losing the verdict is not acceptable — and
the observation is still recorded either way.
"""

from ai.client import ai_client
from ai.free_course.types import AnswerFeedback, LearningObject, Verdict
from ai.types import AIUseCase

_QUESTION_BODY_CHARS = 1200


async def explain_answer(
    *,
    lesson_title: str,
    lesson_objective: str,
    obj: LearningObject,
    learner_answer: str,
    verdict: Verdict | None = None,
    user_id: str | None = None,
) -> AnswerFeedback:
    """Explain an answer. `verdict=None` asks the model to judge it (open items)."""
    payload = obj.payload
    expected_block = ""
    if payload and payload.expected:
        expected_block = f"\n参考答案要点：{payload.expected}"
    if payload and payload.options:
        chosen = next(
            (option.text for option in payload.options if option.id == learner_answer),
            learner_answer,
        )
        expected_block += f"\n选项：{'；'.join(f'{o.id}. {o.text}' for o in payload.options)}"
        learner_answer = chosen
    verdict_block = (
        f"系统已判定：{verdict}。请解释为什么，不要改变判定。"
        if verdict
        else "请你判定（correct / partial / incorrect）并解释。"
    )

    prompt = (
        f"课程：{lesson_title}\n学习目标：{lesson_objective}\n"
        f"题目类型：{obj.kind}｜概念：{obj.concept or '（未标注）'}\n"
        f"题目：{obj.title}\n{obj.body[:_QUESTION_BODY_CHARS]}"
        f"{expected_block}\n\n"
        f"学习者的作答：{learner_answer}\n\n{verdict_block}"
    )
    return await ai_client.generate(
        AIUseCase.FREE_COURSE_FEEDBACK, prompt, AnswerFeedback, user_id=user_id
    )
