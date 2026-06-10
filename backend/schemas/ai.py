"""API contract for AI chat (rules 第十章: every request/response has a schema).

The response of POST /api/v1/chat is an SSE stream, not JSON. The wire
protocol is owned by ai/streaming.py; for reference the events are:

    event: delta   data: {"text": "..."}
    event: usage   data: {"inputTokens": n, "outputTokens": n, "totalTokens": n}
    event: done    data: {}
    event: error   data: {"code": "<business code>", "message": "..."}
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


class ChatMessageIn(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=32_000)


class ChatRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    messages: list[ChatMessageIn] = Field(min_length=1, max_length=100)

    @field_validator("messages")
    @classmethod
    def last_message_must_be_user(
        cls, value: list[ChatMessageIn]
    ) -> list[ChatMessageIn]:
        if value[-1].role != "user":
            raise ValueError("last message must come from the user")
        return value
