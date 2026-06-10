"""Agent definitions: one tool-less Agent per use case (终稿第七章).

Models are never bound at construction — routing.resolve() supplies them per
run, so "change model = edit config" stays true. The system prompt arrives via
LemmaDeps + dynamic instructions (rendered by prompts/registry in client.py),
keeping prompt ownership out of the framework.

Phase 3 tools get registered here (@agent.tool) and nowhere else.
"""

from dataclasses import dataclass

from pydantic_ai import Agent, RunContext

from ai.errors import UnsupportedCapabilityError
from ai.types import AIUseCase


@dataclass
class LemmaDeps:
    system_prompt: str
    user_id: str | None = None
    course_id: str | None = None
    # Phase 3: profile lookups / db handles land here.


text_chat_agent: Agent[LemmaDeps, str] = Agent(deps_type=LemmaDeps)


@text_chat_agent.instructions
def _inject_system_prompt(ctx: RunContext[LemmaDeps]) -> str:
    return ctx.deps.system_prompt


_AGENTS: dict[AIUseCase, Agent[LemmaDeps, str]] = {
    AIUseCase.TEXT_CHAT: text_chat_agent,
}


def agent_for(use_case: AIUseCase) -> Agent[LemmaDeps, str]:
    agent = _AGENTS.get(use_case)
    if agent is None:
        raise UnsupportedCapabilityError(
            f"use case '{use_case}' is not implemented yet"
        )
    return agent
