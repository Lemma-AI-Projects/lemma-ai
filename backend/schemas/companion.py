"""API contracts for the course AI companion (AI 伴学). Wire format is camelCase.

The companion is text-first chat on a course page; when the model needs to see
what the user is watching it calls the load_chapter_video tool and the chapter's
video is injected. The answer streams over SSE (the body of POST /companion/chat
is an SSE stream, not JSON, reusing the chat protocol in ai/streaming.py plus a
`preparing` event emitted ONLY while that tool is uploading the chapter video to
Gemini — not every turn):

    event: preparing data: {}                         # the video tool is preparing the file
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
    """Ask the companion while on a course page.

    conversationId omitted -> start a new companion conversation in this course
    (its id is announced in the X-Conversation-Id response header). chapterId is
    the content node currently open: send it for a video/overview chapter so the
    model can load that chapter's video on demand; send null on a node with no
    video (quiz / assignment / a chapter without a chosen video) — the companion
    then answers from text alone (契约变更: chapterId 由必填改为可选).
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    conversation_id: uuid.UUID | None = None
    chapter_id: uuid.UUID | None = None
    message: str = Field(min_length=1, max_length=32_000)
