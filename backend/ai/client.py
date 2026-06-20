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
import contextlib
from collections.abc import AsyncIterator

from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage
from pydantic_ai.models import Model

from ai.agents import LemmaDeps, agent_for, structured_agent_for
from ai.config import routes_for
from ai.conversion import (
    extract_reasoning_text,
    gemini_usage_to_token_usage,
    response_cost_usd,
    response_metadata,
    serialize_turn,
    split_history_and_prompt,
    stream_response_deltas,
    to_token_usage,
    to_video_part,
)
from ai.errors import UnsupportedCapabilityError, map_framework_error
from ai.media.resolver import ensure_ready
from ai.model_factory import build_model
from ai.native import gemini_video
from ai.prompts.registry import render_system_prompt
from ai.routing import resolve
from ai.types import (
    AIChunk,
    AIResponse,
    AIStructuredResponse,
    AIUseCase,
    ChatMessage,
    ModelRoute,
    StructuredStreamEvent,
    VideoInput,
)
from core import aio
from ai.usage import (
    ensure_failure_recorded,
    finalize_stream,
    record_success,
    start_tracking,
)
from core.config import settings

_VIDEO_USE_CASES = frozenset(
    {
        AIUseCase.VIDEO_QA,
        AIUseCase.VIDEO_SUMMARY,
        AIUseCase.VIDEO_LOCATE,
        AIUseCase.COURSE_COMPANION,
    }
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
        full_reasoning_text = ""
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
            empty_response = False
            raw_parts = None
            previous_text = ""
            previous_reasoning_text = ""
            try:
                try:
                    async for response in stream.stream_response():
                        (
                            text_delta,
                            reasoning_delta,
                            previous_text,
                            previous_reasoning_text,
                        ) = stream_response_deltas(
                            response,
                            previous_text=previous_text,
                            previous_reasoning_text=previous_reasoning_text,
                        )
                        if reasoning_delta:
                            yield AIChunk(
                                kind="reasoning",
                                reasoning_text=reasoning_delta,
                            )
                        if text_delta:
                            emitted_chars += len(text_delta)
                            yield AIChunk(kind="delta", text=text_delta)
                    token_usage = to_token_usage(stream.usage)
                    all_messages = stream.all_messages()
                    actual_model, request_id = response_metadata(all_messages)
                    full_reasoning_text = (
                        extract_reasoning_text(stream.new_messages())
                        or previous_reasoning_text
                    )
                    reasoning_tail = ""
                    if full_reasoning_text.startswith(previous_reasoning_text):
                        reasoning_tail = full_reasoning_text[
                            len(previous_reasoning_text) :
                        ]
                    elif full_reasoning_text != previous_reasoning_text:
                        reasoning_tail = full_reasoning_text
                    if reasoning_tail:
                        yield AIChunk(
                            kind="reasoning",
                            reasoning_text=reasoning_tail,
                        )
                    # Ledger row regardless of output: the provider call
                    # happened and is billed even if it produced no text.
                    # Internal accounting — off the user's critical path
                    # (tracker state flips synchronously inside).
                    aio.spawn_protected(
                        record_success(
                            tracker,
                            usage=token_usage,
                            actual_model=actual_model,
                            request_id=request_id,
                            output_chars=emitted_chars,
                            cost_usd=response_cost_usd(all_messages),
                        )
                    )
                    if emitted_chars > 0:
                        yield AIChunk(kind="usage", usage=token_usage)
                        raw_parts = serialize_turn(stream.new_messages())
                    else:
                        empty_response = True
                except (GeneratorExit, asyncio.CancelledError) as exc:
                    # Client disconnect / stop button: stop token generation
                    # and close the provider connection cleanly.
                    await stream.cancel()
                    interrupted = exc
            finally:
                await stream_cm.__aexit__(None, None, None)
            if interrupted is not None:
                raise interrupted
            if empty_response:
                # Contract invariant: `done` means the turn produced content
                # (and the pair persists). A provider quirk returning zero
                # output must not look like success — the consumer would adopt
                # a conversation id that never materializes. End as an error;
                # the frontend's pre-first-token failure path handles it.
                yield AIChunk(
                    kind="error",
                    error_code="ai_provider_error",
                    error_message="model returned an empty response",
                )
                return
            yield AIChunk(
                kind="done",
                raw_parts=raw_parts,
                reasoning_text=full_reasoning_text or None,
            )
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
            # spawn_protected: under anyio-style re-cancellation a plain await
            # would die instantly and the ledger row would be lost.
            if tracker is not None:
                task = aio.spawn_protected(
                    finalize_stream(tracker, emitted_chars=emitted_chars)
                )
                with contextlib.suppress(asyncio.CancelledError):
                    await asyncio.shield(task)

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

    async def stream_generate[T](
        self,
        use_case: AIUseCase,
        prompt: str,
        output_type: type[T],
        *,
        user_id: str | None = None,
        course_id: str | None = None,
        prompt_vars: dict[str, str] | None = None,
    ) -> AsyncIterator[StructuredStreamEvent[T]]:
        """Structured generation, STREAMED: yield reasoning deltas as the model
        thinks, then exactly one terminal `result` (validated output) or `error`.

        Same facade discipline as generate(), but the answer streams: the visible
        thinking track is surfaced live (course compose -> SSE reasoning) while
        the structured output is assembled, then handed back validated via
        get_output(). Lifecycle mirrors stream_chat — entered manually so a
        consumer disconnect cancels via the official API instead of unwinding
        through the framework context manager, and the ledger is finalized on a
        protected task so an interrupted attempt is still booked.
        """
        tracker = None
        reasoning_chars = 0
        try:
            agent = structured_agent_for(use_case)
            routes = routes_for(use_case)
            deps = LemmaDeps(
                system_prompt=render_system_prompt(use_case, prompt_vars),
                user_id=user_id,
                course_id=course_id,
            )
            model = resolve(use_case)
            tracker = start_tracking(use_case, routes, user_id=user_id)
            stream_cm = agent.run_stream(
                prompt, output_type=output_type, model=model, deps=deps
            )
            stream = await stream_cm.__aenter__()
            interrupted: BaseException | None = None
            output: T | None = None
            result_usage = None
            previous_reasoning_text = ""
            try:
                try:
                    async for response in stream.stream_response():
                        (
                            _text_delta,
                            reasoning_delta,
                            _full_text,
                            previous_reasoning_text,
                        ) = stream_response_deltas(
                            response,
                            previous_text="",
                            previous_reasoning_text=previous_reasoning_text,
                        )
                        if reasoning_delta:
                            reasoning_chars += len(reasoning_delta)
                            yield StructuredStreamEvent(
                                kind="reasoning", reasoning_text=reasoning_delta
                            )
                    # First output matching output_type is the final result.
                    output = await stream.get_output()
                    # A reasoning tail can land in the final messages after the
                    # last streamed snapshot (same correction stream_chat makes).
                    full_reasoning_text = (
                        extract_reasoning_text(stream.new_messages())
                        or previous_reasoning_text
                    )
                    if full_reasoning_text.startswith(previous_reasoning_text):
                        reasoning_tail = full_reasoning_text[
                            len(previous_reasoning_text) :
                        ]
                        if reasoning_tail:
                            reasoning_chars += len(reasoning_tail)
                            yield StructuredStreamEvent(
                                kind="reasoning", reasoning_text=reasoning_tail
                            )
                    result_usage = to_token_usage(stream.usage)
                    all_messages = stream.all_messages()
                    actual_model, request_id = response_metadata(all_messages)
                    aio.spawn_protected(
                        record_success(
                            tracker,
                            usage=result_usage,
                            actual_model=actual_model,
                            request_id=request_id,
                            output_chars=len(str(output)),
                            cost_usd=response_cost_usd(all_messages),
                        )
                    )
                except (GeneratorExit, asyncio.CancelledError) as exc:
                    await stream.cancel()
                    interrupted = exc
            finally:
                await stream_cm.__aexit__(None, None, None)
            if interrupted is not None:
                raise interrupted
            yield StructuredStreamEvent(
                kind="result", result=output, usage=result_usage
            )
        except Exception as exc:
            error = map_framework_error(exc)
            if tracker is not None:
                await ensure_failure_recorded(tracker, error=exc)
            yield StructuredStreamEvent(
                kind="error", error_code=error.code, error_message=error.message
            )
        finally:
            if tracker is not None:
                task = aio.spawn_protected(
                    finalize_stream(tracker, emitted_chars=reasoning_chars)
                )
                with contextlib.suppress(asyncio.CancelledError):
                    await asyncio.shield(task)

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
                reasoning_text = extract_reasoning_text(new_messages)
                cost_usd = response_cost_usd(new_messages)
            else:
                # Native channel: AiHubMix reports no per-call cost -> NULL.
                (
                    text,
                    reasoning_text,
                    usage_metadata,
                    actual_model,
                ) = await gemini_video.answer(
                    model=route.model,
                    system_prompt=system_prompt,
                    question=question,
                    file_uri=video.url or "",
                    mime_type=video.mime_type,
                    timeout_s=route.timeout_s,
                    route_extra=route.extra,
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
            reasoning_text=reasoning_text,
            platform=route.platform,
            model=actual_model or route.model,
            usage=token_usage,
        )

    async def stream_ask_video(
        self,
        use_case: AIUseCase,
        video: VideoInput,
        question: str,
        *,
        history: list[ChatMessage] | None = None,
        user_id: str | None = None,
        course_id: str | None = None,
        conversation_id: str | None = None,
        prompt_vars: dict[str, str] | None = None,
    ) -> AsyncIterator[AIChunk]:
        """Streaming grounded video Q&A (AI 伴学): yield typed AIChunk events
        (reasoning/delta/usage/done/error), the SAME contract as stream_chat so
        the API layer encodes them to SSE identically.

        Native engine only for now (the default); other engines raise — streaming
        on the pydantic_ai path is a later phase. The chapter video reference
        (provider file) is validated for expiry/platform before use; history is
        prior turns (text), the current chapter video is always re-attached by
        gemini_video so the model sees what the user is watching.
        """
        if use_case not in _VIDEO_USE_CASES:
            raise UnsupportedCapabilityError(
                f"'{use_case}' is not a video use case"
            )
        if settings.ai_video_engine != "native":
            raise UnsupportedCapabilityError(
                "streaming video Q&A requires the native video engine"
            )
        ensure_ready(video)
        routes = routes_for(use_case)
        route = routes[0]
        system_prompt = render_system_prompt(use_case, prompt_vars)
        turns: list[tuple[str, str]] = []
        for message in history or []:
            if message.role not in ("user", "assistant"):
                continue
            text = message.content if isinstance(message.content, str) else ""
            if text:
                turns.append((message.role, text))
        tracker = start_tracking(
            use_case, routes, user_id=user_id, conversation_id=conversation_id
        )
        emitted_chars = 0
        usage_metadata = None
        try:
            try:
                async for (
                    text_delta,
                    reasoning_delta,
                    usage,
                ) in gemini_video.stream_companion_answer(
                    model=route.model,
                    system_prompt=system_prompt,
                    question=question,
                    file_uri=video.url or "",
                    mime_type=video.mime_type,
                    history=turns,
                    timeout_s=route.timeout_s,
                    route_extra=route.extra,
                ):
                    if usage is not None:
                        usage_metadata = usage
                    if reasoning_delta:
                        yield AIChunk(
                            kind="reasoning", reasoning_text=reasoning_delta
                        )
                    if text_delta:
                        emitted_chars += len(text_delta)
                        yield AIChunk(kind="delta", text=text_delta)
            except (GeneratorExit, asyncio.CancelledError):
                raise
            token_usage = gemini_usage_to_token_usage(usage_metadata)
            # Internal accounting off the user's critical path (flips tracker
            # state synchronously so finalize_stream below stays a no-op).
            aio.spawn_protected(
                record_success(
                    tracker,
                    usage=token_usage,
                    actual_model=route.model,
                    request_id=None,
                    output_chars=emitted_chars,
                    cost_usd=None,
                )
            )
            if emitted_chars == 0:
                yield AIChunk(
                    kind="error",
                    error_code="ai_provider_error",
                    error_message="model returned an empty response",
                )
                return
            yield AIChunk(kind="usage", usage=token_usage)
            yield AIChunk(kind="done")
        except (GeneratorExit, asyncio.CancelledError):
            raise
        except Exception as exc:
            error = map_framework_error(exc)
            await ensure_failure_recorded(tracker, error=exc)
            yield AIChunk(
                kind="error", error_code=error.code, error_message=error.message
            )
        finally:
            # Client disconnect lands here without record_success: book the
            # interrupted attempt (no-op if success/failure already recorded).
            task = aio.spawn_protected(
                finalize_stream(tracker, emitted_chars=emitted_chars)
            )
            with contextlib.suppress(asyncio.CancelledError):
                await asyncio.shield(task)

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
