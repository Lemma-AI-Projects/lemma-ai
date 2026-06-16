"""Bilibili Video Search actor (hQpkxbmfApbahVZ2B) adapter.

run_input: {keyword, max_results}.

Output field names verified against the LIVE actor (the README's list was
inaccurate). Real keys: bvid / title / author / mid / play_count / likes /
danmaku_count / favorites / duration ("mm:ss") / pub_date (epoch seconds) /
url / thumbnail (often protocol-relative) / description. We read the real names
first and fall back to the README's names (play / like / pubdate / pic /
arcurl) so a future actor revision can't silently null a field again. Titles
may carry <em> search-highlight tags.
"""

from ai.search.normalize import (
    normalize_url,
    parse_duration,
    parse_int,
    parse_published_at,
    strip_html,
)
from ai.search.providers.apify.base import ApifyVideoSearchProvider
from ai.search.types import SearchPlatform, VideoCandidate, VideoSearchQuery


def _first(item: dict, *keys: str):
    """First present (non-None) value among keys — tolerates field renames."""
    for key in keys:
        value = item.get(key)
        if value is not None:
            return value
    return None


def to_candidate(item: dict) -> VideoCandidate | None:
    """Map one Bilibili search dataset item to a VideoCandidate (None to skip)."""
    bvid = item.get("bvid")
    if not bvid:
        return None
    mid = item.get("mid")
    return VideoCandidate(
        platform=SearchPlatform.BILIBILI,
        platform_video_id=str(bvid),
        url=_first(item, "url", "arcurl") or f"https://www.bilibili.com/video/{bvid}",
        title=strip_html(item.get("title")) or "",
        author=item.get("author"),
        author_id=str(mid) if mid not in (None, "") else None,
        duration_s=parse_duration(item.get("duration")),
        view_count=parse_int(_first(item, "play_count", "play")),
        like_count=parse_int(_first(item, "likes", "like")),
        published_at=parse_published_at(_first(item, "pub_date", "pubdate")),
        thumbnail_url=normalize_url(_first(item, "thumbnail", "pic")),
        description=item.get("description"),
        raw=item,
    )


class ApifyBilibiliProvider(ApifyVideoSearchProvider):
    provider_name = "apify_bilibili"
    platform = SearchPlatform.BILIBILI

    def _build_run_input(self, query: VideoSearchQuery, *, max_items: int) -> dict:
        return {"keyword": query.keyword, "max_results": max_items}

    def _to_candidate(self, item: dict) -> VideoCandidate | None:
        return to_candidate(item)
