"""platform -> provider chain, with cost accounting and cross-provider fallback.

Mirrors ai/routing.py's policy: only retryable failures (rate limit, 5xx,
timeout, transport blips) move to the next provider; terminal ones
(SearchProviderError: bad input / auth / not found) abort immediately —
retrying elsewhere just burns money. Every attempt, success or failure, writes
a provider_usage_logs row BEFORE the chain moves on (rules 第八章).

Providers expose the run's id/cost via `last_run` (they hold the Run); this
layer owns timing + accounting + the fallback sequencing, so the boundary
return type stays a clean list[VideoCandidate].
"""

import logging
import time

from ai.errors import AIError, AIProviderError, AIRateLimitError, AITimeoutError
from ai.search.config import SearchRoute, routes_for
from ai.search.errors import SearchProviderError
from ai.search.providers.apify.bilibili import ApifyBilibiliProvider
from ai.search.providers.apify.client import ApifyClient
from ai.search.providers.apify.youtube import ApifyYouTubeProvider
from ai.search.providers.base import VideoSearchProvider
from ai.search.providers.bilibili import BiliSearchProvider
from ai.search.providers.youtube import YtDlpYouTubeProvider
from ai.search.types import SearchPlatform, VideoCandidate, VideoSearchQuery
from ai.search.usage import record_provider_call

logger = logging.getLogger("lemma.ai.search")

_PROVIDERS = {
    "apify_youtube": ApifyYouTubeProvider,
    "apify_bilibili": ApifyBilibiliProvider,
    "ytdlp_youtube": YtDlpYouTubeProvider,
    "bili_search": BiliSearchProvider,
}


class SearchContext:
    """Per-search-call accounting context (trace id ties a call's ledger rows)."""

    def __init__(self, *, trace_id: str, use_case: str, course_id=None) -> None:
        self.trace_id = trace_id
        self.use_case = use_case
        self.course_id = course_id


def _is_retryable(exc: Exception) -> bool:
    # SearchProviderError subclasses AIProviderError, so it must be checked
    # first to stay terminal (no fallback).
    if isinstance(exc, SearchProviderError):
        return False
    return isinstance(exc, (AIRateLimitError, AITimeoutError, AIProviderError))


def _build_provider(
    route: SearchRoute, client: ApifyClient | None, ctx: SearchContext
) -> VideoSearchProvider:
    provider_cls = _PROVIDERS.get(route.provider)
    if provider_cls is None:
        # config.get_search_routes() already rejects unknown providers; this is
        # the defensive backstop.
        raise SearchProviderError(f"unknown search provider '{route.provider}'")
    return provider_cls(client, route, ctx)


async def run_search_chain(
    platform: SearchPlatform,
    query: VideoSearchQuery,
    *,
    limit: int,
    client: ApifyClient | None,
    ctx: SearchContext,
) -> list[VideoCandidate]:
    routes = routes_for(platform)
    last_error: AIError | None = None
    for route in routes:
        provider = _build_provider(route, client, ctx)
        started = time.monotonic()
        try:
            candidates = await provider.search(query, limit=limit)
        except AIError as exc:
            meta = getattr(provider, "last_run", None)
            await record_provider_call(
                trace_id=ctx.trace_id,
                provider=route.provider,
                actor_id=route.actor_id,
                platform=platform.value,
                use_case=ctx.use_case,
                success=False,
                latency_ms=int((time.monotonic() - started) * 1000),
                result_count=None,
                cost_usd=meta.cost_usd if meta else None,
                run_id=meta.run_id if meta else None,
                error_type=type(exc).__name__,
                course_id=ctx.course_id,
            )
            last_error = exc
            if _is_retryable(exc):
                logger.warning(
                    "search provider %s failed (retryable), falling back: %s",
                    route.provider,
                    exc,
                )
                continue
            raise
        meta = getattr(provider, "last_run", None)
        await record_provider_call(
            trace_id=ctx.trace_id,
            provider=route.provider,
            actor_id=route.actor_id,
            platform=platform.value,
            use_case=ctx.use_case,
            success=True,
            latency_ms=int((time.monotonic() - started) * 1000),
            result_count=len(candidates),
            cost_usd=meta.cost_usd if meta else None,
            run_id=meta.run_id if meta else None,
            error_type=None,
            course_id=ctx.course_id,
        )
        return candidates

    if last_error is not None:
        raise last_error
    raise SearchProviderError(f"no search provider available for {platform.value}")
