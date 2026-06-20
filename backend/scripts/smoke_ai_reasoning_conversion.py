"""Smoke: AI reasoning extraction stays framework-part based.

Run from backend/:
    uv run python scripts/smoke_ai_reasoning_conversion.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pydantic_ai.messages import ModelResponse, TextPart, ThinkingPart

from ai.conversion import extract_reasoning_text, stream_response_deltas


def check(condition: bool, label: str) -> None:
    status = "PASS" if condition else "FAIL"
    print(f"{status}  {label}")
    if not condition:
        raise SystemExit(1)


def main() -> int:
    messages = [
        ModelResponse(parts=[ThinkingPart(content="old"), TextPart(content="old answer")]),
        ModelResponse(
            parts=[
                ThinkingPart(content="think "),
                TextPart(content="answer "),
                ThinkingPart(content="more"),
                TextPart(content="done"),
            ]
        ),
    ]
    check(
        extract_reasoning_text(messages) == "think more",
        "extract_reasoning_text reads ThinkingPart.content from last ModelResponse",
    )

    first = ModelResponse(
        parts=[ThinkingPart(content="think"), TextPart(content="hello")]
    )
    text_delta, reasoning_delta, full_text, full_reasoning = stream_response_deltas(
        first, previous_text="", previous_reasoning_text=""
    )
    check(
        (text_delta, reasoning_delta, full_text, full_reasoning)
        == ("hello", "think", "hello", "think"),
        "first stream snapshot splits visible text and reasoning",
    )

    second = ModelResponse(
        parts=[
            ThinkingPart(content="thinking"),
            TextPart(content="hello "),
            TextPart(content="world"),
        ]
    )
    text_delta, reasoning_delta, full_text, full_reasoning = stream_response_deltas(
        second, previous_text=full_text, previous_reasoning_text=full_reasoning
    )
    check(
        (text_delta, reasoning_delta, full_text, full_reasoning)
        == (" world", "ing", "hello world", "thinking"),
        "later stream snapshot uses append-only deltas by part type",
    )

    print("SMOKE OK: reasoning conversion 分轨通过")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
