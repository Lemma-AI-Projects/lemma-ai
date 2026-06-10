"""Boundary types <-> framework types. The only bilingual file (终稿 4.2).

Stateless thin functions; nothing here talks to the network or the database.
"""

from pydantic_ai.messages import (
    ModelMessage,
    ModelRequest,
    ModelResponse,
    TextPart,
    UserPromptPart,
)
from pydantic_ai.usage import RunUsage

from ai.errors import UnsupportedCapabilityError
from ai.types import ChatMessage, TokenUsage


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
    raw: dict[str, int] = dict(run_usage.details)
    if run_usage.cache_read_tokens:
        raw["cache_read_tokens"] = run_usage.cache_read_tokens
    if run_usage.cache_write_tokens:
        raw["cache_write_tokens"] = run_usage.cache_write_tokens
    return TokenUsage(
        input_tokens=run_usage.input_tokens,
        output_tokens=run_usage.output_tokens,
        total_tokens=run_usage.total_tokens,
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
