"""The provider interface: one method, many implementations.

Any future provider (YouTube Data API, a self-hosted Bilibili scraper, …) only
has to implement search(); the routing layer treats them all the same and can
fall back across them.
"""

from typing import Protocol

from ai.search.types import VideoCandidate, VideoSearchQuery


class VideoSearchProvider(Protocol):
    async def search(
        self, query: VideoSearchQuery, *, limit: int
    ) -> list[VideoCandidate]: ...
