"""Boundary types shared with services/, schemas/ and models/.

This module is the only AI vocabulary the rest of the backend is allowed to
see. Framework types (ModelMessage, RunUsage, AgentRunResult, ...) must never
leak out of ai/ — conversion.py translates at the boundary.
"""

from datetime import datetime
from enum import StrEnum
from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class AIUseCase(StrEnum):
    TEXT_CHAT = "text_chat"
    VISION_CHAT = "vision_chat"
    VIDEO_QA = "video_qa"
    VIDEO_SUMMARY = "video_summary"
    VIDEO_LOCATE = "video_locate"
    # Course generation. Each value doubles as its prompt template name
    # (ai/prompts/templates/<value>.system.txt).
    COURSE_INTAKE = "course_intake"
    # 搜索前置重构: TOPIC_SEARCH expands broad queries from the USER REQUEST
    # (not a chapter title); COURSE_COMPOSE selects from the real candidate pool
    # and organizes the chosen videos into units/chapters.
    TOPIC_SEARCH = "topic_search"
    COURSE_COMPOSE = "course_compose"
    # Retired by the search-first flow (kept for historical rows / rollback;
    # no longer on the active path): COURSE_OUTLINE / CHAPTER_QUERY / VIDEO_SELECT.
    COURSE_OUTLINE = "course_outline"
    CHAPTER_QUERY = "chapter_query"
    VIDEO_SELECT = "video_select"
    # Short conversational acknowledgement streamed BEFORE the course-planning
    # tool card is attached to a chat turn (the "AI replies first" beat). A
    # plain text agent like TEXT_CHAT, but with its own prompt so it stays a
    # tight intro instead of answering the topic itself.
    COURSE_PLAN_INTRO = "course_plan_intro"


class VideoInputKind(StrEnum):
    YOUTUBE_URL = "youtube_url"
    PUBLIC_URL = "public_url"
    BASE64 = "base64"
    PROVIDER_FILE_ID = "provider_file_id"


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str | list[dict[str, Any]]


class VideoInput(BaseModel):
    kind: VideoInputKind
    # For PROVIDER_FILE_ID this carries the provider file URI (genai File.uri);
    # for URL kinds it is the public video URL.
    url: str | None = None
    base64_data: str | None = None
    file_id: str | None = None
    # file_id is platform-private: a Gemini Files API id means nothing to
    # OpenRouter. Resolution must refuse cross-platform reuse.
    file_platform: str | None = None
    mime_type: str | None = None
    # Provider files auto-delete (~48h on Gemini Files API); reuse must check
    # this before sending (终稿 8.3).
    expires_at: datetime | None = None


class TokenUsage(BaseModel):
    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None
    reasoning_tokens: int | None = None
    raw: dict[str, Any] = Field(default_factory=dict)


class AIResponse(BaseModel):
    text: str
    reasoning_text: str | None = None
    platform: str
    # Actual model that answered. After a fallback this can differ from the
    # primary route; response metadata wins over the routing table.
    model: str
    usage: TokenUsage | None = None


class AIStructuredResponse(BaseModel, Generic[T]):
    output: T
    reasoning_text: str | None = None
    platform: str
    model: str
    usage: TokenUsage | None = None


class AIChunk(BaseModel):
    """One typed streaming event from the AIClient facade.

    services/ subscribe to these for persistence; the API layer encodes them
    to SSE via ai/streaming.py. Exactly one terminal event ends every stream:
    done (success) or error (failure — possibly after some deltas).
    """

    kind: Literal["delta", "reasoning", "usage", "done", "error", "tool"]
    # delta
    text: str | None = None
    # reasoning: internal-only thinking delta/full text, not exposed over SSE yet
    reasoning_text: str | None = None
    # usage
    usage: TokenUsage | None = None
    # done: framework-serialized turn (schema-tagged) for ai_messages.raw_parts_json
    raw_parts: dict[str, Any] | None = None
    # error
    error_code: str | None = None
    error_message: str | None = None
    # tool: a wire-ready (camelCase) payload attaching a tool card to this turn,
    # e.g. {"type": "course_planning", "courseId": "<uuid>"}. Lemma-owned, not
    # framework-shaped; the frontend renders the matching tool block.
    tool: dict[str, Any] | None = None


class ModelRoute(BaseModel):
    platform: str  # "aihubmix" / "openrouter"
    adapter: str  # "openai_compatible" / "openrouter" / "gemini_video"
    model: str
    # Lower number wins; multiple routes for one use case form a fallback chain.
    priority: int = 0
    timeout_s: float = 30
    # Platform-specific passthrough, e.g. openrouter_models / openrouter_provider.
    extra: dict[str, Any] = Field(default_factory=dict)
