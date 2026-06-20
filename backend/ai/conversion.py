"""Boundary types <-> framework types. The only bilingual file (终稿 4.2).

Stateless thin functions; nothing here talks to the network or the database.
"""

from decimal import Decimal, InvalidOperation
from typing import Any

from google.genai import types as genai_types
from pydantic_ai.messages import (
    ModelMessage,
    ModelMessagesTypeAdapter,
    ModelRequest,
    ModelResponse,
    ThinkingPart,
    TextPart,
    UserPromptPart,
    VideoUrl,
)
from pydantic_ai.usage import RunUsage

from ai.errors import UnsupportedCapabilityError
from ai.types import ChatMessage, TokenUsage, VideoInput


def split_history_and_prompt(
    messages: list[ChatMessage],
) -> tuple[list[ModelMessage], str]:
    """Split boundary messages into framework history + the current user prompt.

    System messages are dropped on purpose: the system prompt is injected via
    Agent instructions (prompts/registry), so keeping them in the history would
    send a duplicate system prompt.
    """
    if not messages or messages[-1].role != "user":
        raise ValueError("conversation must end with a user message")

    prompt = _text_content(messages[-1])
    history: list[ModelMessage] = []
    for message in messages[:-1]:
        if message.role == "system":
            continue
        text = _text_content(message)
        if message.role == "user":
            history.append(ModelRequest(parts=[UserPromptPart(content=text)]))
        else:
            history.append(ModelResponse(parts=[TextPart(content=text)]))
    return history, prompt


def _text_content(message: ChatMessage) -> str:
    if isinstance(message.content, str):
        return message.content
    raise UnsupportedCapabilityError(
        "structured message content is not supported yet (multimodal lands in Phase 2)"
    )


def to_token_usage(run_usage: RunUsage) -> TokenUsage:
    raw: dict[str, Any] = dict(run_usage.details)
    if run_usage.cache_read_tokens:
        raw["cache_read_tokens"] = run_usage.cache_read_tokens
    if run_usage.cache_write_tokens:
        raw["cache_write_tokens"] = run_usage.cache_write_tokens
    reasoning_tokens = _extract_reasoning_tokens(raw)
    return TokenUsage(
        input_tokens=run_usage.input_tokens,
        output_tokens=run_usage.output_tokens,
        total_tokens=run_usage.total_tokens,
        reasoning_tokens=reasoning_tokens,
        raw=raw,
    )


def response_metadata(
    messages: list[ModelMessage],
) -> tuple[str | None, str | None]:
    """(actual_model, provider_response_id) from the last model response.

    After a fallback the routing table no longer knows which model answered;
    the response metadata is the truth.
    """
    for message in reversed(messages):
        if isinstance(message, ModelResponse):
            return message.model_name, message.provider_response_id
    return None, None


def extract_reasoning_text(messages: list[ModelMessage]) -> str | None:
    """ThinkingPart text from the last framework model response.

    pydantic-ai 1.106.0 does not expose `ModelResponse.thinking`; provider
    reasoning is normalized into ThinkingPart entries inside `parts`.
    """
    for message in reversed(messages):
        if isinstance(message, ModelResponse):
            _, reasoning_text = response_text_and_reasoning(message)
            return reasoning_text or None
    return None


def response_text_and_reasoning(response: ModelResponse) -> tuple[str, str]:
    """Visible text and thinking text from a ModelResponse snapshot.

    Stream snapshots are cumulative. Callers can diff the returned strings
    without depending on part ordering or provider-specific raw fields.
    """
    text_parts: list[str] = []
    reasoning_parts: list[str] = []
    for part in response.parts:
        content = getattr(part, "content", None)
        if not isinstance(content, str):
            continue
        if isinstance(part, TextPart):
            text_parts.append(content)
        elif isinstance(part, ThinkingPart):
            reasoning_parts.append(content)
    return "".join(text_parts), "".join(reasoning_parts)


def stream_response_deltas(
    response: ModelResponse,
    *,
    previous_text: str,
    previous_reasoning_text: str,
) -> tuple[str, str, str, str]:
    """Return (text_delta, reasoning_delta, full_text, full_reasoning_text)."""
    full_text, full_reasoning_text = response_text_and_reasoning(response)
    return (
        _append_only_delta(previous_text, full_text),
        _append_only_delta(previous_reasoning_text, full_reasoning_text),
        full_text,
        full_reasoning_text,
    )


def _append_only_delta(previous: str, current: str) -> str:
    if current == previous:
        return ""
    if current.startswith(previous):
        return current[len(previous) :]
    # Providers should stream append-only snapshots. If a provider rewrites a
    # snapshot, prefer surfacing the current content over silently dropping it.
    return current


def _extract_reasoning_tokens(raw: dict[str, Any]) -> int | None:
    keys = (
        "reasoning_tokens",
        "thoughts_tokens",
        "thoughts_token_count",
        "completion_tokens_details.reasoning_tokens",
    )
    for key in keys:
        value = raw.get(key)
        if isinstance(value, int) and value > 0:
            return value
    completion_details = raw.get("completion_tokens_details")
    if isinstance(completion_details, dict):
        value = completion_details.get("reasoning_tokens")
        if isinstance(value, int) and value > 0:
            return value
    return None


def serialize_turn(messages: list[ModelMessage]) -> dict[str, Any]:
    """Framework messages -> JSON-safe attachment for ai_messages.raw_parts_json.

    Dual-track storage (终稿第十一章): content_text stays the source of truth;
    this blob is the optional exact-rebuild attachment. The schema tag lets a
    future framework swap recognize and migrate (or ignore) old blobs.
    """
    return {
        "schema": "pydantic_ai/v1",
        "messages": ModelMessagesTypeAdapter.dump_python(messages, mode="json"),
    }


def response_cost_usd(messages: list[ModelMessage]) -> Decimal | None:
    """Money the platform itself reported for this call, if any.

    OpenRouter puts a `cost` field in provider_details when the route demands
    usage accounting (openrouter_usage include — 终稿 6.2 纪律 3). Platforms
    that report nothing yield None: the ledger stores NULL, never a guess.
    """
    for message in reversed(messages):
        if isinstance(message, ModelResponse):
            cost = (message.provider_details or {}).get("cost")
            if cost is None:
                return None
            try:
                # str() first: Decimal(0.0000319) would inherit float noise.
                return Decimal(str(cost))
            except (InvalidOperation, ValueError):
                return None
    return None


def to_video_part(video: VideoInput, engine: str) -> Any:
    """Provider file reference -> the video part each engine understands.

    Callers run media/resolver.ensure_ready() first, so only PROVIDER_FILE_ID
    with a valid URI reaches this point (最新决策 2: Files API only).
    """
    mime_type = video.mime_type or "video/mp4"
    if engine == "pydantic_ai":
        return VideoUrl(url=video.url or "", media_type=mime_type)
    return genai_types.Part.from_uri(file_uri=video.url or "", mime_type=mime_type)


def gemini_usage_to_token_usage(
    metadata: genai_types.GenerateContentResponseUsageMetadata | None,
) -> TokenUsage:
    """usage_metadata (native video channel) -> boundary TokenUsage.

    Gemini bills thinking tokens as output, but reports them separately from
    candidates_token_count — fold them into output_tokens and keep the
    breakdown in raw so input + output stays ≈ total.
    """
    if metadata is None:
        return TokenUsage()
    raw: dict[str, Any] = {}
    if metadata.thoughts_token_count:
        raw["thoughts_token_count"] = metadata.thoughts_token_count
    if metadata.cached_content_token_count:
        raw["cached_content_token_count"] = metadata.cached_content_token_count
    output_tokens = (metadata.candidates_token_count or 0) + (
        metadata.thoughts_token_count or 0
    )
    return TokenUsage(
        input_tokens=metadata.prompt_token_count,
        output_tokens=output_tokens or None,
        total_tokens=metadata.total_token_count,
        reasoning_tokens=metadata.thoughts_token_count or None,
        raw=raw,
    )
