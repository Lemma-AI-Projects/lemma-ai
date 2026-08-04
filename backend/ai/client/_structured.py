"""Structured generation, STREAMED — part of the AIClient facade.

stream_generate() surfaces the visible thinking track live (course compose ->
SSE reasoning) while the structured output is assembled, then handed back
validated via get_output(). Lifecycle mirrors stream_chat.
"""

import asyncio
import contextlib
from collections.abc import AsyncIterator

from ai.agents import LemmaDeps, structured_agent_for
from ai.config import routes_for
from ai.conversion import (
    extract_reasoning_text,
    response_cost_usd,
    response_metadata,
    stream_response_deltas,
    to_token_usage,
)
from ai.errors import map_framework_error
from ai.prompts.registry import render_system_prompt
from ai.routing import resolve
from ai.types import AIUseCase, StructuredStreamEvent
from ai.usage import (
    ensure_failure_recorded,
    finalize_stream,
    record_success,
    start_tracking,
)
from core import aio


class StructuredMixin:

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
                            tracker.mark_first_token()
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
