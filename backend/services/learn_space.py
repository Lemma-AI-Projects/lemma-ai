"""Learn space onboarding: companion agent draft generation.

The draft is generated but NOT persisted on this path — the user shapes it in
the onboarding dialog (own customization or an agent template), then the space
is created through the existing project API with the final persona attached.
"""

from ai import AIUseCase, ai_client
from schemas.learn_space import AgentDraftIn, AgentDraftOut


async def generate_agent_draft(payload: AgentDraftIn, user_id: str) -> AgentDraftOut:
    """One-shot structured generation of the space's companion agent draft.

    User-provided preferences (name / personality / teaching style) are passed
    through; the model follows them and fills the rest (notably the welcome).
    """
    user_prompt = payload.space_name
    if payload.agent_name or payload.personality or payload.teaching_style:
        user_prompt += "\n\n我的偏好："
        if payload.agent_name:
            user_prompt += f"\n- 名字：{payload.agent_name}"
        if payload.personality:
            user_prompt += f"\n- 性格：{payload.personality}"
        if payload.teaching_style:
            user_prompt += f"\n- 教学风格：{payload.teaching_style}"
    return await ai_client.generate(
        AIUseCase.AGENT_DRAFT,
        user_prompt,
        AgentDraftOut,
        user_id=user_id,
        prompt_vars={
            "space_name": payload.space_name,
            "agent_name": payload.agent_name or "（未指定）",
            "personality": payload.personality or "（未指定）",
            "teaching_style": payload.teaching_style or "（未指定）",
        },
    )
