"""Streaming text (plain + tool-enabled) — part of the AIClient facade.

stream_chat() yields typed AIChunk events; the tool path runs the framework's
FC loop with FallbackModel failover intact (tools survive platform failover).
"""

import asyncio
import contextlib
from collections.abc import AsyncIterator
from typing import Any

from pydantic_ai import Agent
from pydantic_ai.usage import UsageLimits

from ai.client._core import _TOOL_REQUEST_LIMIT
from ai.conversion import (
    deltas_from_stream_event,
    extract_reasoning_text,
    response_cost_usd,
    response_metadata,
    serialize_turn,
    stream_response_deltas,
    to_pydantic_toolset,
    to_token_usage,
)
from ai.errors import map_framework_error
from ai.tools.types import ToolBinding
from ai.types import AIChunk, AIUseCase, ChatMessage
from ai.usage import (
    ensure_failure_recorded,
    finalize_stream,
    record_success,
    start_tracking,
)
from core import aio


class StreamMixin:

    async def stream_chat(
        self,
        use_case: AIUseCase,
        messages: list[ChatMessage],
        *,
        user_id: str | None = None,
        course_id: str | None = None,
        conversation_id: str | None = None,
        prompt_vars: dict[str, str] | None = None,
        tools: list[ToolBinding] | None = None,
    ) -> AsyncIterator[AIChunk]:
        """Yield typed AIChunk events. Errors end the stream with an `error`
        chunk: once the first token is out there is no silent model switching
        (终稿 5.3), the caller decides whether to retry.

        `tools` binds channel-agnostic plugin tools (决策⑩-a 修订) for this
        turn: the framework runs the FC loop (tools survive FallbackModel
        platform failover), handlers are service-injected closures, and a
        handler's `card` payload surfaces as AIChunk(kind="tool")."""
        if tools:
            async for chunk in self._stream_chat_with_tools(
                use_case,
                messages,
                tools,
                user_id=user_id,
                course_id=course_id,
                conversation_id=conversation_id,
                prompt_vars=prompt_vars,
            ):
                yield chunk
            return
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
                            tracker.mark_first_token()
                            yield AIChunk(
                                kind="reasoning",
                                reasoning_text=reasoning_delta,
                            )
                        if text_delta:
                            tracker.mark_first_token()
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

    async def _stream_chat_with_tools(
        self,
        use_case: AIUseCase,
        messages: list[ChatMessage],
        tools: list[ToolBinding],
        *,
        user_id: str | None,
        course_id: str | None,
        conversation_id: str | None,
        prompt_vars: dict[str, str] | None,
    ) -> AsyncIterator[AIChunk]:
        """Tool-enabled streaming turn on the framework channel (agent.iter).

        The framework owns the FC loop (model -> tool -> feed-back -> continue)
        and FallbackModel keeps working, so tools survive a platform failover.
        We iterate graph nodes: model-request nodes stream delta/reasoning
        chunks; tool cards pushed by handlers into `card_sink` are flushed as
        AIChunk(kind="tool") as soon as the producing tool has run. Ledger,
        cancellation and empty-response discipline mirror the plain path.
        """
        tracker = None
        emitted_chars = 0
        streamed_reasoning = ""
        full_reasoning_text = ""
        card_sink: list[dict[str, Any]] = []
        try:
            agent, deps, history, prompt, model, routes = self._prepare(
                use_case, messages, user_id, course_id, prompt_vars
            )
            toolset = to_pydantic_toolset(tools, card_sink)
            tracker = start_tracking(
                use_case, routes, user_id=user_id, conversation_id=conversation_id
            )
            # Entered manually for the same reason stream_chat does it: a
            # consumer disconnect must not unwind THROUGH the framework's
            # context manager (GeneratorExit cascade).
            run_cm = agent.iter(
                prompt,
                model=model,
                deps=deps,
                message_history=history,
                toolsets=[toolset],
                usage_limits=UsageLimits(request_limit=_TOOL_REQUEST_LIMIT),
            )
            run = await run_cm.__aenter__()
            interrupted: BaseException | None = None
            empty_response = False
            raw_parts = None
            try:
                try:
                    async for node in run:
                        if Agent.is_model_request_node(node):
                            async with node.stream(run.ctx) as node_stream:
                                async for event in node_stream:
                                    text_delta, reasoning_delta = (
                                        deltas_from_stream_event(event)
                                    )
                                    if reasoning_delta:
                                        streamed_reasoning += reasoning_delta
                                        tracker.mark_first_token()
                                        yield AIChunk(
                                            kind="reasoning",
                                            reasoning_text=reasoning_delta,
                                        )
                                    if text_delta:
                                        emitted_chars += len(text_delta)
                                        tracker.mark_first_token()
                                        yield AIChunk(kind="delta", text=text_delta)
                        elif Agent.is_call_tools_node(node):
                            # Tools execute while this stream is consumed;
                            # flush cards promptly so the frontend mounts the
                            # card before the closing answer streams.
                            async with node.stream(run.ctx) as node_stream:
                                async for _event in node_stream:
                                    while card_sink:
                                        yield AIChunk(
                                            kind="tool", tool=card_sink.pop(0)
                                        )
                        while card_sink:
                            yield AIChunk(kind="tool", tool=card_sink.pop(0))

                    token_usage = to_token_usage(run.usage)
                    result = run.result
                    all_messages = result.all_messages() if result else []
                    new_messages = result.new_messages() if result else []
                    actual_model, request_id = response_metadata(all_messages)
                    full_reasoning_text = (
                        extract_reasoning_text(new_messages) or streamed_reasoning
                    )
                    reasoning_tail = ""
                    if full_reasoning_text.startswith(streamed_reasoning):
                        reasoning_tail = full_reasoning_text[
                            len(streamed_reasoning) :
                        ]
                    elif full_reasoning_text != streamed_reasoning:
                        reasoning_tail = full_reasoning_text
                    if reasoning_tail:
                        yield AIChunk(
                            kind="reasoning", reasoning_text=reasoning_tail
                        )
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
                        raw_parts = serialize_turn(new_messages)
                    else:
                        empty_response = True
                except (GeneratorExit, asyncio.CancelledError) as exc:
                    interrupted = exc
            finally:
                # Close the graph deterministically. Under an interrupted
                # stream the TaskGroup self-cancels and __aexit__ finishes with
                # CancelledError — suppress it (BaseException, not Exception):
                # we cannot let generator teardown fan out to the caller loop.
                with contextlib.suppress(BaseException):
                    await run_cm.__aexit__(None, None, None)
            if interrupted is not None:
                # Interrupted stream (stop button / client disconnect). Terminate
                # WITHOUT re-raising: re-raising GeneratorExit/CancelledError here
                # propagates through run_cm.__aexit__'s TaskGroup, whose exit is
                # cut short so its user-facing cancel scope keeps the host task
                # registered; the dangling generator is later GC'd as an
                # `async_generator_athrow` finalizer that re-cancels the scope and
                # poisons the caller's event loop. Normal return closes the
                # generator tree cleanly; the interrupted turn is already booked
                # by the protected-write in `finally` (and finalize_stream).
                return
            if empty_response:
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
            if tracker is not None:
                task = aio.spawn_protected(
                    finalize_stream(tracker, emitted_chars=emitted_chars)
                )
                with contextlib.suppress(asyncio.CancelledError):
                    await asyncio.shield(task)
