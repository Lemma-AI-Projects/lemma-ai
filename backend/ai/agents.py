"""Agent definitions: one tool-less Agent per use case (终稿第七章).

Models are never bound at construction — routing.resolve() supplies them per
run, so "change model = edit config" stays true. The system prompt arrives via
LemmaDeps + dynamic instructions (rendered by prompts/registry in client.py),
keeping prompt ownership out of the framework.

Two families: text agents output str (chat); structured agents bind a
pydantic output_type for structured generation (client.generate).
"""

from dataclasses import dataclass
from typing import Any

from pydantic_ai import Agent, RunContext

from ai.errors import UnsupportedCapabilityError
from ai.types import AIUseCase


@dataclass
class LemmaDeps:
    system_prompt: str
    user_id: str | None = None
    # Phase 3: profile lookups / db handles land here.


def _inject_system_prompt(ctx: RunContext[LemmaDeps]) -> str:
    return ctx.deps.system_prompt


def _build_agent() -> Agent[LemmaDeps, str]:
    agent: Agent[LemmaDeps, str] = Agent(deps_type=LemmaDeps)
    agent.instructions(_inject_system_prompt)
    return agent


def _build_structured_agent(output_type: type[Any]) -> Agent[LemmaDeps, Any]:
    """Agent that returns our pydantic output_type instead of str. The framework
    type stays inside ai/; client.generate hands back the validated instance."""
    agent: Agent[LemmaDeps, Any] = Agent(deps_type=LemmaDeps, output_type=output_type)
    agent.instructions(_inject_system_prompt)
    return agent


text_chat_agent = _build_agent()

_AGENTS: dict[AIUseCase, Agent[LemmaDeps, str]] = {
    AIUseCase.TEXT_CHAT: text_chat_agent,
}

_STRUCTURED_AGENTS: dict[AIUseCase, Agent[LemmaDeps, Any]] = {}


def agent_for(use_case: AIUseCase) -> Agent[LemmaDeps, str]:
    agent = _AGENTS.get(use_case)
    if agent is None:
        raise UnsupportedCapabilityError(
            f"use case '{use_case}' is not implemented yet"
        )
    return agent


def structured_agent_for(use_case: AIUseCase) -> Agent[LemmaDeps, Any]:
    agent = _STRUCTURED_AGENTS.get(use_case)
    if agent is None:
        raise UnsupportedCapabilityError(
            f"use case '{use_case}' has no structured agent"
        )
    return agent
