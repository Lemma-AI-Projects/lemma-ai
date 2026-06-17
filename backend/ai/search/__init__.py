"""Video-search facade.

services/ and ai/coursegen/ call only search_videos(...) and only ever see the
boundary types (VideoCandidate / VideoSearchQuery / SearchPlatform). Apify, its
client, its raw items and the routing/cost machinery all stay inside this
package.

Client lifecycle: pass `client` to reuse one across many searches (the future
Celery task builds one per task and reuses it across chapters); omit it and the
facade builds and closes its own — that's the convenience path the smoke uses.
`use_case` / `course_id` are optional accounting context written to
provider_usage_logs.
"""

import uuid

from ai.search.config import validate_search_routes
from ai.search.errors import SearchProviderError
from ai.search.providers.apify.client import ApifyClient, aclose_client, build_client
from ai.search.routing import SearchContext, run_search_chain
from ai.search.types import SearchPlatform, VideoCandidate, VideoSearchQuery

__all__ = [
    "ApifyClient",
    "SearchPlatform",
    "SearchProviderError",
    "VideoCandidate",
    "VideoSearchQuery",
    "aclose_client",
    "build_client",
    "search_videos",
    "validate_search_routes",
]


async def search_videos(
    query: VideoSearchQuery,
    *,
    platform: SearchPlatform,
    limit: int,
    use_case: str = "video_search",
    course_id: uuid.UUID | None = None,
    client: ApifyClient | None = None,
) -> list[VideoCandidate]:
    owns_client = client is None
    if client is None:
        client = build_client()
    ctx = SearchContext(
        trace_id=uuid.uuid4().hex, use_case=use_case, course_id=course_id
    )
    try:
        return await run_search_chain(
            platform, query, limit=limit, client=client, ctx=ctx
        )
    finally:
        if owns_client:
            await aclose_client(client)
