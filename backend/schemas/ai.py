"""API contract for AI chat (rules 第十章: every request/response has a schema).

Phase 2 contract: conversation history lives SERVER-SIDE. Every request sends
exactly one new user message; pass conversationId to continue an existing
conversation, omit it to start a new one. The response carries the
conversation id in the X-Conversation-Id header.

The response body of POST /api/v1/chat is an SSE stream, not JSON. The wire
protocol is owned by ai/streaming.py; for reference the events are:

    event: delta   data: {"text": "..."}
    event: usage   data: {"inputTokens": n, "outputTokens": n, "totalTokens": n}
    event: done    data: {}
    event: error   data: {"code": "<business code>", "message": "..."}
"""

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


class ChatMessageIn(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    role: Literal["user"]
    content: str = Field(min_length=1, max_length=32_000)


class ChatRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    # None -> start a new conversation. The list shape (instead of a single
    # message field) is kept for wire compatibility with Phase 1 clients and
    # future needs (e.g. edited-turn regeneration).
    conversation_id: uuid.UUID | None = None
    # Only meaningful when starting a NEW conversation: the conversation is
    # born inside this project. Ignored when conversationId is present
    # (moving an existing conversation goes through PATCH /conversations).
    project_id: uuid.UUID | None = None
    messages: list[ChatMessageIn] = Field(min_length=1, max_length=1)

    @field_validator("messages")
    @classmethod
    def single_user_message(cls, value: list[ChatMessageIn]) -> list[ChatMessageIn]:
        if value[-1].role != "user":
            raise ValueError("last message must come from the user")
        return value

    @property
    def user_content(self) -> str:
        return self.messages[-1].content
