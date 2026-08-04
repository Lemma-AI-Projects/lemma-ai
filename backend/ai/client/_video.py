"""Video-grounded Q&A (native / pydantic_ai) — part of the AIClient facade.

ask_video() (engine-switched), stream_ask_video() and stream_tool_chat() run on
the native gemini channel; all share routing, prompts, error mapping and the
ledger with the rest of the facade.
"""

import asyncio
import contextlib
from collections.abc import AsyncIterator

from ai.agents import LemmaDeps, agent_for
from ai.client._core import _VIDEO_USE_CASES
from ai.config import routes_for
from ai.conversion import (
    extract_reasoning_text,
    gemini_usage_to_token_usage,
    response_cost_usd,
    response_metadata,
    to_token_usage,
    to_video_part,
)
from ai.errors import UnsupportedCapabilityError, map_framework_error
from ai.media.resolver import ensure_ready
from ai.model_factory import build_model
from ai.native import gemini_video
from ai.prompts.registry import render_system_prompt
from ai.tools.types import ToolBinding, ToolCall, ToolProgress, ToolResult
from ai.types import AIChunk, AIResponse, AIUseCase, ChatMessage, TokenUsage, VideoInput
from ai.usage import (
    ensure_failure_recorded,
    finalize_stream,
    record_success,
    start_tracking,
)
from core import aio
from core.config import settings


class VideoMixin:

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

        tracker.mark_first_token()
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
        media_resolution: str | None = None,
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
        # Long-video downgrade (7-3 工单): the caller may force a lower media
        # resolution so the request stays under the provider's 1M-token cap.
        route_extra = (
            {**(route.extra or {}), "media_resolution": media_resolution}
            if media_resolution
            else route.extra
        )
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
                    route_extra=route_extra,
                ):
                    if usage is not None:
                        usage_metadata = usage
                    if reasoning_delta:
                        tracker.mark_first_token()
                        yield AIChunk(
                            kind="reasoning", reasoning_text=reasoning_delta
                        )
                    if text_delta:
                        emitted_chars += len(text_delta)
                        tracker.mark_first_token()
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

    async def stream_tool_chat(
        self,
        use_case: AIUseCase,
        *,
        question: str,
        history: list[ChatMessage] | None = None,
        tools: list[ToolBinding] | None = None,
        user_id: str | None = None,
        course_id: str | None = None,
        conversation_id: str | None = None,
        prompt_vars: dict[str, str] | None = None,
        media_resolution: str | None = None,
    ) -> AsyncIterator[AIChunk]:
        """Text-first streaming chat with optional function-calling tools (决策⑩-a).

        The model answers in text by default and may call a bound tool (e.g. load
        the chapter video) when it decides it needs it; the manual FC loop runs
        on the native channel inside gemini_video and yields AIChunk events
        identical to stream_chat (so the API encodes them via encode_chunk). Tool
        HANDLERS are injected by the caller (services) — ai/ never imports
        services; new tools are added by binding a ToolSpec + handler, the loop
        is untouched. Native engine only (tools + media + text on one channel).
        """
        if settings.ai_video_engine != "native":
            raise UnsupportedCapabilityError(
                "tool-calling chat requires the native gemini channel"
            )
        routes = routes_for(use_case)
        route = routes[0]
        system_prompt = render_system_prompt(use_case, prompt_vars)
        # Long-video downgrade (7-3 工单): must match the overview's choice for
        # the chapter so implicit context caching keeps hitting (见 plan 2.5).
        route_extra = (
            {**(route.extra or {}), "media_resolution": media_resolution}
            if media_resolution
            else route.extra
        )
        turns: list[tuple[str, str]] = []
        for message in history or []:
            if message.role not in ("user", "assistant"):
                continue
            text = message.content if isinstance(message.content, str) else ""
            if text:
                turns.append((message.role, text))
        handlers = {binding.spec.name: binding.handler for binding in tools or []}
        specs = [binding.spec for binding in tools or []]

        async def dispatch(
            call: ToolCall,
        ) -> AsyncIterator[ToolProgress | ToolResult]:
            handler = handlers.get(call.name)
            if handler is None:
                # Unknown tool — hand the model a graceful error so it recovers.
                yield ToolResult(response={"status": "unknown_tool"})
                return
            async for event in handler(call):
                yield event

        tracker = start_tracking(
            use_case, routes, user_id=user_id, conversation_id=conversation_id
        )
        emitted_chars = 0
        final_usage = TokenUsage()
        try:
            try:
                async for chunk in gemini_video.stream_tool_chat(
                    model=route.model,
                    system_prompt=system_prompt,
                    question=question,
                    history=turns,
                    tool_specs=specs,
                    dispatch=dispatch,
                    timeout_s=route.timeout_s,
                    route_extra=route_extra,
                ):
                    if chunk.kind == "usage":
                        # Internal: the turn's summed usage. Recorded once below;
                        # not relayed here to avoid a duplicate SSE usage frame.
                        final_usage = chunk.usage or TokenUsage()
                        continue
                    if chunk.kind == "delta" and chunk.text:
                        emitted_chars += len(chunk.text)
                    if chunk.kind in ("delta", "reasoning"):
                        tracker.mark_first_token()
                    yield chunk  # reasoning / delta / preparing
            except (GeneratorExit, asyncio.CancelledError):
                raise
            aio.spawn_protected(
                record_success(
                    tracker,
                    usage=final_usage,
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
            yield AIChunk(kind="usage", usage=final_usage)
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
            task = aio.spawn_protected(
                finalize_stream(tracker, emitted_chars=emitted_chars)
            )
            with contextlib.suppress(asyncio.CancelledError):
                await asyncio.shield(task)
