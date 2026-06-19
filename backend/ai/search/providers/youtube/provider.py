"""YouTube search provider via yt-dlp ``ytsearchN:`` (self-built, free, no key).

yt-dlp is synchronous, so search() runs it in a worker thread (anyio.to_thread)
to keep the event loop unblocked — the same discipline as tasks/ytdlp.py. Default
is flat extraction (cheap, low risk-control exposure): id / title / url / channel
+ channel_id / duration / view_count / thumbnails / description snippet. Setting
``route.extra.full_extract`` flips to per-video extraction to add like_count /
comment_count / upload_date / full description (more requests, higher exposure).
No long-lived client — the (client, route, ctx) constructor ignores ``client``.
Native yt-dlp errors map to the AI error family so run_search_chain can bill and
fall back.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

import anyio
import yt_dlp

from ai.errors import AIError, AIProviderError, AIRateLimitError, AITimeoutError
from ai.search.normalize import (
    normalize_url,
    parse_duration,
    parse_int,
    parse_published_at,
    pick_thumbnail,
)
from ai.search.providers.base import ProviderRunMeta
from ai.search.types import SearchPlatform, VideoCandidate, VideoSearchQuery


def to_candidate(entry: dict[str, Any]) -> VideoCandidate | None:
    """Map one yt-dlp search entry (flat or full) to a VideoCandidate."""
    video_id = entry.get("id")
    if not video_id:
        return None
    url = entry.get("url") or entry.get("webpage_url") or ""
    # Flat entries sometimes carry a bare id or odd url; normalize to a watch URL.
    if not url.startswith("http"):
        url = f"https://www.youtube.com/watch?v={video_id}"
    return VideoCandidate(
        platform=SearchPlatform.YOUTUBE,
        platform_video_id=str(video_id),
        url=url,
        title=entry.get("title") or "",
        author=entry.get("channel") or entry.get("uploader"),
        # channel_id enables a future YouTube author-homepage link (Apify's
        # YouTube search items could not supply a stable one).
        author_id=entry.get("channel_id"),
        duration_s=parse_duration(entry.get("duration")),
        view_count=parse_int(entry.get("view_count")),
        # like_count / comment_count / tags / upload_date are present only with
        # full_extract; flat search omits them.
        like_count=parse_int(entry.get("like_count")),
        published_at=parse_published_at(
            entry.get("timestamp") or entry.get("upload_date")
        ),
        thumbnail_url=pick_thumbnail(entry.get("thumbnails"))
        or normalize_url(entry.get("thumbnail")),
        description=entry.get("description"),
        comment_count=parse_int(entry.get("comment_count")),
        tags=[tag for tag in (entry.get("tags") or []) if isinstance(tag, str)],
        raw=entry,
    )


def _map_ytdlp_error(exc: Exception) -> AIError:
    """Native yt-dlp / network exception -> AI error family (retryability per rules)."""
    if isinstance(exc, AIError):
        return exc
    message = str(exc).lower()
    if (
        "429" in message
        or "too many requests" in message
        or "sign in to confirm" in message
        or "not a bot" in message
    ):
        return AIRateLimitError("youtube rate limited / bot check", raw=exc)
    if "timed out" in message or "timeout" in message:
        return AITimeoutError("yt-dlp search timed out", raw=exc)
    return AIProviderError("yt-dlp search failed", raw=exc)


class YtDlpYouTubeProvider:
    provider_name = "ytdlp_youtube"
    platform = SearchPlatform.YOUTUBE

    def __init__(self, client: Any, route: Any, ctx: Any) -> None:
        # No long-lived client; the Apify `client` is ignored.
        self._route = route
        self._ctx = ctx
        # Free provider: book cost_usd=0 / run_id=None whatever the outcome.
        self.last_run = ProviderRunMeta(cost_usd=Decimal("0"))

    async def search(
        self, query: VideoSearchQuery, *, limit: int
    ) -> list[VideoCandidate]:
        count = max(1, min(limit, self._route.max_items))
        full = bool(self._route.extra.get("full_extract", False))
        try:
            entries = await anyio.to_thread.run_sync(
                self._extract, query.keyword, count, full
            )
        except Exception as exc:  # noqa: BLE001 — normalize every failure here
            raise _map_ytdlp_error(exc) from exc
        candidates = [
            candidate
            for entry in entries
            if (candidate := to_candidate(entry)) is not None
        ]
        return candidates[:limit]

    def _extract(self, keyword: str, count: int, full: bool) -> list[dict[str, Any]]:
        options: dict[str, Any] = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
        }
        if full:
            # Per-video extraction can fail on a single result; skip those rather
            # than sink the whole search.
            options["ignoreerrors"] = True
        else:
            options["extract_flat"] = "in_playlist"
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(f"ytsearch{count}:{keyword}", download=False)
        if not info:
            return []
        return [entry for entry in (info.get("entries") or []) if entry]
