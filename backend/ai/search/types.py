"""Boundary types for the video-search layer.

These are the ONLY shapes allowed to leave ai/search/. Provider SDK structures
(Apify dataset items, the Run object, ...) must never cross this boundary —
each provider maps its raw items into VideoCandidate. The opaque `raw` field is
a deliberate passthrough (Phase 5 stores it in candidate.raw_json for audit /
re-ranking); it is never interpreted outside the provider that produced it.
"""

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class SearchPlatform(StrEnum):
    YOUTUBE = "youtube"
    BILIBILI = "bilibili"


class VideoSearchQuery(BaseModel):
    keyword: str
    # Optional knobs the YouTube actor understands; ignored by providers that
    # don't support them (e.g. the Bilibili actor only takes a keyword).
    order: str | None = None  # YouTube sortingOrder, e.g. "relevance"
    date_filter: str | None = None  # YouTube dateFilter, e.g. "month"


class VideoCandidate(BaseModel):
    platform: SearchPlatform
    platform_video_id: str
    url: str
    title: str
    author: str | None = None
    author_id: str | None = None
    duration_s: int | None = None
    view_count: int | None = None
    like_count: int | None = None
    published_at: datetime | None = None
    thumbnail_url: str | None = None
    description: str | None = None
    # Rich engagement signals consumed by course composition (selection AI).
    # Neutral across platforms — each provider maps what it has; platform-
    # specific extras (B站 favorite/coin/danmaku) go in `metrics` so the boundary
    # stays neutral and `raw` stays opaque.
    comment_count: int | None = None
    tags: list[str] = Field(default_factory=list)
    metrics: dict[str, int] = Field(default_factory=dict)
    # Provider's untouched item, opaque outside the producing provider.
    raw: dict[str, Any] = Field(default_factory=dict)
