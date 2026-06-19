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

from ai.search.config import platform_uses_apify, validate_search_routes
from ai.search.errors import SearchProviderError
from ai.search.providers.apify.client import ApifyClient, aclose_client, build_client
from ai.search.providers.bilibili import aclose_search_clients
from ai.search.routing import SearchContext, run_search_chain
from ai.search.types import SearchPlatform, VideoCandidate, VideoSearchQuery

__all__ = [
    "ApifyClient",
    "SearchPlatform",
    "SearchProviderError",
    "VideoCandidate",
    "VideoSearchQuery",
    "aclose_client",
    "aclose_search_clients",
    "build_client",
    "platform_uses_apify",
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
    # The Apify client is built (and token-required) ONLY when a route for this
    # platform actually uses Apify. Self-built providers (ytdlp/bili) ignore the
    # `client` arg and manage their own per-loop clients, so under the default
    # self-built-only table no Apify client is created. A caller-supplied client
    # is always reused as-is (course_build's one-per-build apify client).
    owns_client = client is None
    if client is None and platform_uses_apify(platform):
        client = build_client()
    else:
        owns_client = False
    ctx = SearchContext(
        trace_id=uuid.uuid4().hex, use_case=use_case, course_id=course_id
    )
    try:
        return await run_search_chain(
            platform, query, limit=limit, client=client, ctx=ctx
        )
    finally:
        if owns_client and client is not None:
            await aclose_client(client)
