"""AIClient — the only door services/ may use to reach any LLM (rules 第八章).

chat()        -> AIResponse                      (non-streaming)
stream_chat() -> AsyncIterator[str]              (Lemma SSE-encoded events)

One flow for everything: render prompt -> resolve route -> convert types ->
run agent -> map errors -> account usage. Framework objects never escape.

The facade signature matches the all-self-built design (终稿 2.2 退路边界):
if the framework ever has to go, only the inside of this package changes.
"""

from collections.abc import AsyncIterator

from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage
from pydantic_ai.models import Model

from ai.agents import LemmaDeps, agent_for
from ai.config import routes_for
from ai.conversion import response_metadata, split_history_and_prompt, to_token_usage
from ai.errors import map_framework_error
from ai.prompts.registry import render_system_prompt
from ai.routing import resolve
from ai.streaming import delta_event, done_event, error_event, usage_event
from ai.types import AIResponse, AIUseCase, ChatMessage, ModelRoute
from ai.usage import (
    ensure_failure_recorded,
    finalize_stream,
    record_success,
    start_tracking,
)


class AIClient:
    async def chat(
        self,
        use_case: AIUseCase,
        messages: list[ChatMessage],
        *,
        user_id: str | None = None,
        course_id: str | None = None,
        prompt_vars: dict[str, str] | None = None,
    ) -> AIResponse:
        agent, deps, history, prompt, model, routes = self._prepare(
            use_case, messages, user_id, course_id, prompt_vars
        )
        tracker = start_tracking(use_case, routes)
        try:
            result = await agent.run(
                prompt, model=model, deps=deps, message_history=history
            )
        except Exception as exc:
            ensure_failure_recorded(tracker, error=exc)
            raise map_framework_error(exc) from exc

        token_usage = to_token_usage(result.usage)
        actual_model, request_id = response_metadata(result.new_messages())
        route = tracker.current_route
        record_success(
            tracker,
            usage=token_usage,
            actual_model=actual_model,
            request_id=request_id,
            output_chars=len(result.output),
        )
        return AIResponse(
            text=result.output,
            platform=route.platform,
            model=actual_model or route.model,
            usage=token_usage,
        )

    async def stream_chat(
        self,
        use_case: AIUseCase,
        messages: list[ChatMessage],
        *,
        user_id: str | None = None,
        course_id: str | None = None,
        prompt_vars: dict[str, str] | None = None,
    ) -> AsyncIterator[str]:
        """Yield Lemma SSE events. Errors end the stream with an `error` event:
        once the first token is out there is no silent model switching (终稿 5.3),
        the frontend decides whether to retry."""
        tracker = None
        emitted_chars = 0
        try:
            agent, deps, history, prompt, model, routes = self._prepare(
                use_case, messages, user_id, course_id, prompt_vars
            )
            tracker = start_tracking(use_case, routes)
            async with agent.run_stream(
                prompt, model=model, deps=deps, message_history=history
            ) as stream:
                async for delta in stream.stream_text(delta=True):
                    emitted_chars += len(delta)
                    yield delta_event(delta)
                token_usage = to_token_usage(stream.usage)
                actual_model, request_id = response_metadata(stream.all_messages())
                record_success(
                    tracker,
                    usage=token_usage,
                    actual_model=actual_model,
                    request_id=request_id,
                    output_chars=emitted_chars,
                )
                yield usage_event(token_usage)
            yield done_event()
        except Exception as exc:
            error = map_framework_error(exc)
            if tracker is not None:
                ensure_failure_recorded(tracker, error=exc)
            yield error_event(error)
        finally:
            # Client disconnects (CancelledError/GeneratorExit) skip the except
            # block above but always land here: book the interrupted attempt.
            if tracker is not None:
                finalize_stream(tracker, emitted_chars=emitted_chars)

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


ai_client = AIClient()
