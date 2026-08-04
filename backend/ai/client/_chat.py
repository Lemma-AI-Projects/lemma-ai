"""Non-streaming text / structured generation — part of the AIClient facade.

Split from ai/client.py (P0 modularity). chat() and generate*() are the
one-shot entry points; the streaming analogues live in _stream / _structured.
"""

from ai.agents import LemmaDeps, structured_agent_for
from ai.config import routes_for
from ai.conversion import (
    extract_reasoning_text,
    response_cost_usd,
    response_metadata,
    to_token_usage,
)
from ai.errors import map_framework_error
from ai.prompts.registry import render_system_prompt
from ai.routing import resolve
from ai.types import AIResponse, AIStructuredResponse, AIUseCase, ChatMessage
from ai.usage import ensure_failure_recorded, record_success, start_tracking


class ChatMixin:

    async def chat(
        self,
        use_case: AIUseCase,
        messages: list[ChatMessage],
        *,
        user_id: str | None = None,
        course_id: str | None = None,
        conversation_id: str | None = None,
        prompt_vars: dict[str, str] | None = None,
    ) -> AIResponse:
        agent, deps, history, prompt, model, routes = self._prepare(
            use_case, messages, user_id, course_id, prompt_vars
        )
        tracker = start_tracking(
            use_case, routes, user_id=user_id, conversation_id=conversation_id
        )
        try:
            result = await agent.run(
                prompt, model=model, deps=deps, message_history=history
            )
            tracker.mark_first_token()
        except Exception as exc:
            await ensure_failure_recorded(tracker, error=exc)
            raise map_framework_error(exc) from exc

        token_usage = to_token_usage(result.usage)
        new_messages = result.new_messages()
        actual_model, request_id = response_metadata(new_messages)
        reasoning_text = extract_reasoning_text(new_messages)
        route = tracker.current_route
        await record_success(
            tracker,
            usage=token_usage,
            actual_model=actual_model,
            request_id=request_id,
            output_chars=len(result.output),
            cost_usd=response_cost_usd(new_messages),
        )
        return AIResponse(
            text=result.output,
            reasoning_text=reasoning_text,
            platform=route.platform,
            model=actual_model or route.model,
            usage=token_usage,
        )

    async def generate[T](
        self,
        use_case: AIUseCase,
        prompt: str,
        output_type: type[T],
        *,
        user_id: str | None = None,
        course_id: str | None = None,
        prompt_vars: dict[str, str] | None = None,
    ) -> T:
        """Structured generation: one-shot prompt -> a validated pydantic model.

        Same facade discipline as chat/ask_video — render prompt, resolve route,
        run, map errors, account usage (ai_usage_logs) — but the framework's
        structured output is handed back as our own model. Used by ai/coursegen.
        """
        response = await self.generate_with_response(
            use_case,
            prompt,
            output_type,
            user_id=user_id,
            course_id=course_id,
            prompt_vars=prompt_vars,
        )
        return response.output

    async def generate_with_response[T](
        self,
        use_case: AIUseCase,
        prompt: str,
        output_type: type[T],
        *,
        user_id: str | None = None,
        course_id: str | None = None,
        prompt_vars: dict[str, str] | None = None,
    ) -> AIStructuredResponse[T]:
        """Structured generation with boundary metadata for opt-in callers."""
        agent = structured_agent_for(use_case)
        routes = routes_for(use_case)
        deps = LemmaDeps(
            system_prompt=render_system_prompt(use_case, prompt_vars),
            user_id=user_id,
            course_id=course_id,
        )
        model = resolve(use_case)
        tracker = start_tracking(use_case, routes, user_id=user_id)
        try:
            result = await agent.run(
                prompt, output_type=output_type, model=model, deps=deps
            )
            tracker.mark_first_token()
        except Exception as exc:
            await ensure_failure_recorded(tracker, error=exc)
            raise map_framework_error(exc) from exc

        token_usage = to_token_usage(result.usage)
        new_messages = result.new_messages()
        actual_model, request_id = response_metadata(new_messages)
        reasoning_text = extract_reasoning_text(new_messages)
        route = tracker.current_route
        await record_success(
            tracker,
            usage=token_usage,
            actual_model=actual_model,
            request_id=request_id,
            output_chars=len(str(result.output)),
            cost_usd=response_cost_usd(new_messages),
        )
        return AIStructuredResponse(
            output=result.output,
            reasoning_text=reasoning_text,
            platform=route.platform,
            model=actual_model or route.model,
            usage=token_usage,
        )
