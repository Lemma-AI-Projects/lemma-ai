"""Learn space onboarding: companion agent draft generation (v1 轻度自定义).

The draft is generated but NOT persisted on this path — the user lightly edits
it in the onboarding dialog, then the space is created through the existing
project API (data-model upgrade to learn spaces lands in E1.1). The edited
agent profile becomes the space's SOUL.md-style persona injected via the
C1 (lemma_context_blocks) channel once E1 lands.
"""

from ai import AIUseCase, ai_client
from schemas.learn_space import AgentDraftOut


async def generate_agent_draft(space_name: str, user_id: str) -> AgentDraftOut:
    """One-shot structured generation of the space's companion agent draft."""
    return await ai_client.generate(
        AIUseCase.AGENT_DRAFT,
        space_name,
        AgentDraftOut,
        user_id=user_id,
        prompt_vars={"space_name": space_name},
    )
