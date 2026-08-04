"""Shared core of the AIClient facade — route resolution + request preparation.

Part of the ai/client package split (P0 modularity). Holds the constants and
the `_prepare` step every facade method reuses. Pure orchestration, no LLM I/O.
"""

from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage
from pydantic_ai.models import Model

from ai.agents import LemmaDeps, agent_for
from ai.config import routes_for
from ai.conversion import split_history_and_prompt
from ai.prompts.registry import render_system_prompt
from ai.routing import resolve
from ai.types import AIUseCase, ChatMessage, ModelRoute

_VIDEO_USE_CASES = frozenset(
    {
        AIUseCase.VIDEO_QA,
        AIUseCase.VIDEO_SUMMARY,
        AIUseCase.VIDEO_LOCATE,
        AIUseCase.COURSE_COMPANION,
        AIUseCase.COURSE_OVERVIEW,
    }
)

# Request budget for a tool-enabled text turn: parity with the native loop's
# _MAX_TOOL_ROUNDS=4 (up to 4 tool rounds + the closing answer).
_TOOL_REQUEST_LIMIT = 5


class _PrepareMixin:

    def _prepare(
        self,
        use_case: AIUseCase,
        messages: list[ChatMessage],
        user_id: str | None,
        course_id: str | None,
        prompt_vars: dict[str, str] | None,
    ) -> tuple[
        Agent[LemmaDeps, str],
        LemmaDeps,
        list[ModelMessage],
        str,
        Model,
        tuple[ModelRoute, ...],
    ]:
        agent = agent_for(use_case)
        routes = routes_for(use_case)
        deps = LemmaDeps(
            system_prompt=render_system_prompt(use_case, prompt_vars),
            user_id=user_id,
            course_id=course_id,
        )
        history, prompt = split_history_and_prompt(messages)
        model = resolve(use_case)
        return agent, deps, history, prompt, model, routes
