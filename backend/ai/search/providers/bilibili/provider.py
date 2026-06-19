"""Bilibili official Web search provider — x/web-interface/wbi/search/type.

Anonymous and free; maps each result item to the boundary VideoCandidate. WBI
signing is opt-in via ``route.extra.wbi`` (default off — the endpoint currently
accepts unsigned requests). Risk-control responses (-412 / v_voucher) surface as
retryable so a configured fallback (e.g. Apify) can take over; with the default
self-built-only chain the leg simply fails and the chapter retries — never a
silent paid fallback. Construction signature is (client, route, ctx) to match
routing._build_provider; the Apify ``client`` is ignored (this provider uses the
per-loop BiliClient).
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from ai.errors import AIRateLimitError
from ai.search.errors import SearchProviderError
from ai.search.normalize import (
    normalize_url,
    parse_duration,
    parse_int,
    parse_published_at,
    strip_html,
)
from ai.search.providers.base import ProviderRunMeta
from ai.search.providers.bilibili import wbi
from ai.search.providers.bilibili.client import get_bili_client
from ai.search.types import SearchPlatform, VideoCandidate, VideoSearchQuery

_SEARCH_URL = "https://api.bilibili.com/x/web-interface/wbi/search/type"


def _split_tags(value: Any) -> list[str]:
    """Bilibili `tag` is a comma-joined string ("线性代数,课程,数学")."""
    if not isinstance(value, str):
        return []
    return [tag.strip() for tag in value.split(",") if tag.strip()]


def _metrics(item: dict[str, Any]) -> dict[str, int]:
    """Platform-specific engagement signals (no neutral VideoCandidate column)."""
    out: dict[str, int] = {}
    for name, key in (("danmaku", "danmaku"), ("favorites", "favorites")):
        value = parse_int(item.get(key))
        if value is not None:
            out[name] = value
    return out


def to_candidate(item: dict[str, Any]) -> VideoCandidate | None:
    """Map one Bilibili search result item to a VideoCandidate (None to skip).

    Rich signals for compose: review -> comment_count, tag -> tags,
    danmaku/favorites -> metrics. coin/share aren't in search results; they (and
    anything unmapped) stay in ``raw`` (-> raw_json). Titles carry <em> search-
    highlight tags, stripped here; thumbnails are protocol-relative -> https.
    """
    bvid = item.get("bvid")
    if not bvid:
        return None
    mid = item.get("mid")
    return VideoCandidate(
        platform=SearchPlatform.BILIBILI,
        platform_video_id=str(bvid),
        url=f"https://www.bilibili.com/video/{bvid}",
        title=strip_html(item.get("title")) or "",
        author=item.get("author"),
        # mid drives the space.bilibili.com homepage link in video_asset_service.
        author_id=str(mid) if mid not in (None, "", 0) else None,
        duration_s=parse_duration(item.get("duration")),
        view_count=parse_int(item.get("play")),
        like_count=parse_int(item.get("like")),
        published_at=parse_published_at(item.get("pubdate")),
        thumbnail_url=normalize_url(item.get("pic")),
        description=item.get("description"),
        comment_count=parse_int(item.get("review")),
        tags=_split_tags(item.get("tag")),
        metrics=_metrics(item),
        raw=item,
    )


class BiliSearchProvider:
    provider_name = "bili_search"
    platform = SearchPlatform.BILIBILI

    def __init__(self, client: Any, route: Any, ctx: Any) -> None:
        # `client` is the Apify client threaded by search_videos; a self-built
        # provider ignores it and uses the per-loop BiliClient instead.
        self._route = route
        self._ctx = ctx
        # Free provider: a run costs nothing whether it succeeds or fails, so the
        # ledger always books cost_usd=0 / run_id=None (set up front so a failure
        # before search() returns still bills correctly).
        self.last_run = ProviderRunMeta(cost_usd=Decimal("0"))

    async def search(
        self, query: VideoSearchQuery, *, limit: int
    ) -> list[VideoCandidate]:
        page_size = max(1, min(limit, self._route.max_items))
        params: dict[str, Any] = {
            "search_type": "video",
            "keyword": query.keyword,
            "page": 1,
            "page_size": page_size,
        }
        client = get_bili_client()
        if self._route.extra.get("wbi", False):
            params = await wbi.sign(params, client=client)
        data = await client.get_json(_SEARCH_URL, params)

        code = data.get("code")
        payload = data.get("data") or {}
        if code != 0:
            if code == -412:
                raise AIRateLimitError(
                    f"bilibili risk control (code={code})", raw=data.get("message")
                )
            raise SearchProviderError(
                f"bilibili search failed (code={code}): {data.get('message')}"
            )
        results = payload.get("result") or []
        if not results:
            # Empty WITH a v_voucher is soft risk control (retry / fall back);
            # a genuinely empty search just yields no candidates.
            if payload.get("v_voucher"):
                raise AIRateLimitError("bilibili risk control (v_voucher)")
            return []
        candidates = [
            candidate
            for item in results
            if (candidate := to_candidate(item)) is not None
        ]
        return candidates[:limit]
