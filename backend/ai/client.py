"""AIClient — the only door services/ may use to reach any LLM (rules 第八章).

chat()        -> AIResponse                      (non-streaming text)
stream_chat() -> AsyncIterator[AIChunk]          (typed streaming events)
ask_video()   -> AIResponse                      (video Q&A, engine-switched)

One flow for everything: render prompt -> resolve route -> convert types ->
run engine -> map errors -> account usage. Framework objects never escape.

stream_chat yields typed AIChunk events so services/ can subscribe (e.g.
persist the finished turn) without parsing wire bytes; the API layer encodes
chunks to SSE via ai/streaming.encode_chunk. Protocol ownership stays here.

The facade signature matches the all-self-built design (终稿 2.2 退路边界):
if the framework ever has to go, only the inside of this package changes.
"""

import asyncio
from collections.abc import AsyncIterator

from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage
from pydantic_ai.models import Model

from ai.agents import LemmaDeps, agent_for
from ai.config import routes_for
from ai.conversion import (
    gemini_usage_to_token_usage,
    response_cost_usd,
    response_metadata,
    serialize_turn,
    split_history_and_prompt,
    to_token_usage,
    to_video_part,
)
from ai.errors import UnsupportedCapabilityError, map_framework_error
from ai.media.resolver import ensure_ready
from ai.model_factory import build_model
from ai.native import gemini_video
from ai.prompts.registry import render_system_prompt
from ai.routing import resolve
from ai.types import AIChunk, AIResponse, AIUseCase, ChatMessage, ModelRoute, VideoInput
from ai.usage import (
    ensure_failure_recorded,
    finalize_stream,
    record_success,
    start_tracking,
)
from core.config import settings

_VIDEO_USE_CASES = frozenset(
    {AIUseCase.VIDEO_QA, AIUseCase.VIDEO_SUMMARY, AIUseCase.VIDEO_LOCATE}
)


class AIClient:
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
        except Exception as exc:
            await ensure_failure_recorded(tracker, error=exc)
            raise map_framework_error(exc) from exc

        token_usage = to_token_usage(result.usage)
        new_messages = result.new_messages()
        actual_model, request_id = response_metadata(new_messages)
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
        conversation_id: str | None = None,
        prompt_vars: dict[str, str] | None = None,
    ) -> AsyncIterator[AIChunk]:
        """Yield typed AIChunk events. Errors end the stream with an `error`
        chunk: once the first token is out there is no silent model switching
        (终稿 5.3), the caller decides whether to retry."""
        tracker = None
        emitted_chars = 0
        try:
            agent, deps, history, prompt, model, routes = self._prepare(
                use_case, messages, user_id, course_id, prompt_vars
            )
            tracker = start_tracking(
                use_case, routes, user_id=user_id, conversation_id=conversation_id
            )
            # Entered manually instead of `async with`: when the consumer
            # disconnects, a GeneratorExit would otherwise unwind THROUGH the
            # framework's context manager and trip its internals ("coroutine
            # ignored GeneratorExit" cascade — found by smoke test). Instead we
            # cancel via the official API, exit the context cleanly, and only
            # then re-raise the interruption.
            stream_cm = agent.run_stream(
                prompt, model=model, deps=deps, message_history=history
            )
            stream = await stream_cm.__aenter__()
            interrupted: BaseException | None = None
            try:
                try:
                    async for delta in stream.stream_text(delta=True):
                        emitted_chars += len(delta)
                        yield AIChunk(kind="delta", text=delta)
                    token_usage = to_token_usage(stream.usage)
                    all_messages = stream.all_messages()
                    actual_model, request_id = response_metadata(all_messages)
                    await record_success(
                        tracker,
                        usage=token_usage,
                        actual_model=actual_model,
                        request_id=request_id,
                        output_chars=emitted_chars,
                        cost_usd=response_cost_usd(all_messages),
                    )
                    yield AIChunk(kind="usage", usage=token_usage)
                    raw_parts = serialize_turn(stream.new_messages())
                except (GeneratorExit, asyncio.CancelledError) as exc:
                    # Client disconnect / stop button: stop token generation
                    # and close the provider connection cleanly.
                    await stream.cancel()
                    interrupted = exc
            finally:
                await stream_cm.__aexit__(None, None, None)
            if interrupted is not None:
                raise interrupted
            yield AIChunk(kind="done", raw_parts=raw_parts)
        except Exception as exc:
            error = map_framework_error(exc)
            if tracker is not None:
                await ensure_failure_recorded(tracker, error=exc)
            yield AIChunk(
                kind="error", error_code=error.code, error_message=error.message
            )
        finally:
            # Client disconnects (CancelledError/GeneratorExit) skip the except
            # block above but always land here: book the interrupted attempt.
            if tracker is not None:
                await finalize_stream(tracker, emitted_chars=emitted_chars)

    async def ask_video(
        self,
        use_case: AIUseCase,
        video: VideoInput,
        question: str,
        *,
        user_id: str | None = None,
        course_id: str | None = None,
        conversation_id: str | None = None,
        prompt_vars: dict[str, str] | None = None,
    ) -> AIResponse:
        """Video Q&A (终稿 9.2). AI_VIDEO_ENGINE picks the execution path:
        native (default) -> google-genai direct; pydantic_ai -> GoogleModel.
        Both paths share routing, prompts, error mapping and the ledger."""
        if use_case not in _VIDEO_USE_CASES:
            raise UnsupportedCapabilityError(
                f"'{use_case}' is not a video use case"
            )
        ensure_ready(video)
        routes = routes_for(use_case)
        route = routes[0]
        system_prompt = render_system_prompt(use_case, prompt_vars)
        engine = settings.ai_video_engine
        tracker = start_tracking(
            use_case, routes, user_id=user_id, conversation_id=conversation_id
        )
        cost_usd = None
        try:
            if engine == "pydantic_ai":
                agent = agent_for(use_case)
                deps = LemmaDeps(
                    system_prompt=system_prompt, user_id=user_id, course_id=course_id
                )
                result = await agent.run(
                    [question, to_video_part(video, engine)],
                    model=build_model(route),
                    deps=deps,
                )
                text = result.output
                token_usage = to_token_usage(result.usage)
                new_messages = result.new_messages()
                actual_model, request_id = response_metadata(new_messages)
                cost_usd = response_cost_usd(new_messages)
            else:
                # Native channel: AiHubMix reports no per-call cost -> NULL.
                text, usage_metadata, actual_model = await gemini_video.answer(
                    model=route.model,
                    system_prompt=system_prompt,
                    question=question,
                    file_uri=video.url or "",
                    mime_type=video.mime_type,
                    timeout_s=route.timeout_s,
                )
                token_usage = gemini_usage_to_token_usage(usage_metadata)
                request_id = None
        except Exception as exc:
            await ensure_failure_recorded(tracker, error=exc)
            raise map_framework_error(exc) from exc

        await record_success(
            tracker,
            usage=token_usage,
            actual_model=actual_model,
            request_id=request_id,
            output_chars=len(text),
            cost_usd=cost_usd,
        )
        return AIResponse(
            text=text,
            platform=route.platform,
            model=actual_model or route.model,
            usage=token_usage,
        )

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
