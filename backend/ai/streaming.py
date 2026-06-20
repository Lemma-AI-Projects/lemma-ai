"""Lemma's SSE protocol (终稿 6.4). Event names and payloads are OWNED BY LEMMA
and never follow the framework — the frontend codes against this contract:

    event: delta   data: {"text": "..."}
    event: reasoning data: {"text": "..."}
    event: usage   data: {"inputTokens": n, "outputTokens": n, "totalTokens": n}
    event: tool    data: {"type": "course_planning", "courseId": "<uuid>"}
    event: done    data: {}
    event: error   data: {"code": "<business code>", "message": "..."}

The `tool` event attaches an interactive tool card to the current turn (a
deterministic, client-triggered tool — distinct from the LLM tool_call /
tool_result events still reserved for later phases, 裁决 10). Its
payload is already wire-shaped (camelCase) and passed through verbatim.
"""

import json
from typing import Any

from ai.types import AIChunk, TokenUsage


def _encode(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def delta_event(text: str) -> str:
    return _encode("delta", {"text": text})


def reasoning_event(text: str) -> str:
    return _encode("reasoning", {"text": text})


def usage_event(usage: TokenUsage) -> str:
    return _encode(
        "usage",
        {
            "inputTokens": usage.input_tokens,
            "outputTokens": usage.output_tokens,
            "totalTokens": usage.total_tokens,
        },
    )


def tool_event(payload: dict[str, Any]) -> str:
    # Payload is already wire-shaped (camelCase) and Lemma-owned; pass through.
    return _encode("tool", payload)


def done_event() -> str:
    return _encode("done", {})


def error_event(code: str, message: str) -> str:
    # Only the stable business code and a safe message — raw provider details
    # stay in the logs (errors.py keeps them on error.raw).
    return _encode("error", {"code": code, "message": message})


def encode_chunk(chunk: AIChunk) -> str:
    """Typed facade event -> Lemma SSE frame (the API layer calls this).

    Internal-only payloads (raw_parts on done) deliberately never reach the
    wire — they exist for persistence, not for the frontend.
    """
    if chunk.kind == "delta":
        return delta_event(chunk.text or "")
    if chunk.kind == "reasoning":
        return reasoning_event(chunk.reasoning_text or "")
    if chunk.kind == "usage":
        return usage_event(chunk.usage or TokenUsage())
    if chunk.kind == "tool":
        return tool_event(chunk.tool or {})
    if chunk.kind == "done":
        return done_event()
    return error_event(chunk.error_code or "ai_error", chunk.error_message or "")
