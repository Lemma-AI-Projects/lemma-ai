"""YouTube Scraper actor (h7sDV53CddomktSi5) adapter.

run_input: searchQueries / maxResults / sortingOrder / dateFilter / videoType.
Output items carry id / title / url / viewCount / duration ("29:54" or
"00:03:17") / channelName / date / thumbnailUrl. Items the scraper couldn't
fetch arrive with an `error` field (e.g. VIDEO_UNAVAILABLE) and are skipped.
"""

from ai.search.normalize import parse_duration, parse_int, parse_published_at
from ai.search.providers.apify.base import ApifyVideoSearchProvider
from ai.search.types import SearchPlatform, VideoCandidate, VideoSearchQuery


def to_candidate(item: dict) -> VideoCandidate | None:
    """Map one YouTube Scraper dataset item to a VideoCandidate (None to skip)."""
    if item.get("error"):
        return None
    video_id = item.get("id")
    if not video_id:
        return None
    return VideoCandidate(
        platform=SearchPlatform.YOUTUBE,
        platform_video_id=str(video_id),
        url=item.get("url") or f"https://www.youtube.com/watch?v={video_id}",
        title=item.get("title") or "",
        author=item.get("channelName"),
        # Search results expose only a channel URL, no clean stable id.
        author_id=None,
        duration_s=parse_duration(item.get("duration")),
        view_count=parse_int(item.get("viewCount")),
        like_count=parse_int(item.get("likes")),
        published_at=parse_published_at(item.get("date")),
        thumbnail_url=item.get("thumbnailUrl"),
        description=item.get("text"),
        raw=item,
    )


class ApifyYouTubeProvider(ApifyVideoSearchProvider):
    provider_name = "apify_youtube"
    platform = SearchPlatform.YOUTUBE

    def _build_run_input(self, query: VideoSearchQuery, *, max_items: int) -> dict:
        run_input: dict = {
            "searchQueries": [query.keyword],
            "maxResults": max_items,
            "videoType": "video",
            "sortingOrder": query.order or "relevance",
        }
        if query.date_filter:
            run_input["dateFilter"] = query.date_filter
        return run_input

    def _to_candidate(self, item: dict) -> VideoCandidate | None:
        return to_candidate(item)
