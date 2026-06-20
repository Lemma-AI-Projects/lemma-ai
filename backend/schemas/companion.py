"""API contracts for the course AI companion (AI 伴学). Wire format is camelCase.

The companion is grounded video Q&A: while watching a chapter the user asks a
question; the answer streams over SSE (the body of POST /companion/chat is an SSE
stream, not JSON, reusing the chat protocol in ai/streaming.py plus a `preparing`
event while the chapter video is being prepared for Gemini):

    event: preparing data: {}                         # video being uploaded to Gemini
    event: reasoning data: {"text": "..."}
    event: delta     data: {"text": "..."}
    event: usage     data: {"inputTokens": n, ...}
    event: done      data: {}
    event: error     data: {"code": "<business code>", "message": "..."}
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CompanionConversationOut(BaseModel):
    """A course companion conversation (right-rail pill)."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    title: str | None
    updated_at: datetime


class CompanionChatRequest(BaseModel):
    """Ask the companion about the chapter the user is watching.

    conversationId omitted -> start a new companion conversation in this course
    (its id is announced in the X-Conversation-Id response header). chapterId is
    the chapter currently being watched: its re-hosted video is always attached
    so the model sees what the user sees.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    conversation_id: uuid.UUID | None = None
    chapter_id: uuid.UUID
    message: str = Field(min_length=1, max_length=32_000)
