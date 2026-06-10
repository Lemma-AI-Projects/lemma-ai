"""Lemma's SSE protocol (终稿 6.4). Event names and payloads are OWNED BY LEMMA
and never follow the framework — the frontend codes against this contract:

    event: delta   data: {"text": "..."}
    event: usage   data: {"inputTokens": n, "outputTokens": n, "totalTokens": n}
    event: done    data: {}
    event: error   data: {"code": "<business code>", "message": "..."}

Reserved for later phases (裁决 10): tool_call / tool_result / reasoning.
"""

import json
from typing import Any

from ai.errors import AIError
from ai.types import TokenUsage


def _encode(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def delta_event(text: str) -> str:
    return _encode("delta", {"text": text})


def usage_event(usage: TokenUsage) -> str:
    return _encode(
        "usage",
        {
            "inputTokens": usage.input_tokens,
            "outputTokens": usage.output_tokens,
            "totalTokens": usage.total_tokens,
        },
    )


def done_event() -> str:
    return _encode("done", {})


def error_event(error: AIError) -> str:
    # Only the stable business code and a safe message — raw provider details
    # stay in the logs (errors.py keeps them on error.raw).
    return _encode("error", {"code": error.code, "message": error.message})
