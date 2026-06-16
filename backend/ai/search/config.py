"""SEARCH_ROUTES_JSON parsing + startup validation (mirrors ai/config.py).

Env reading stays in core/config.py (the single Settings truth); this module
turns SEARCH_ROUTES_JSON into typed, priority-sorted SearchRoute chains per
platform and fails fast on unknown providers / malformed entries. The routing
table is the one truth for "platform -> provider -> actor" (配置即真相): swapping
to a cheaper provider with Apify as fallback is a config edit, zero code change.
"""

import json
from functools import lru_cache

from pydantic import BaseModel, ValidationError

from ai.errors import AIConfigError
from ai.search.types import SearchPlatform
from core.config import settings

# Providers with an implementation in ai/search/providers/. The downloader actor
# (all video downloader) is intentionally NOT here — it's a future video-
# understanding download provider, not a search provider.
_KNOWN_PROVIDERS = {"apify_youtube", "apify_bilibili"}


class SearchRoute(BaseModel):
    provider: str
    actor_id: str
    max_items: int = 20
    max_total_charge_usd: float = 0.3
    timeout_s: float = 120
    # Lower number wins; multiple routes for one platform form a fallback chain.
    priority: int = 0


@lru_cache(maxsize=1)
def get_search_routes() -> dict[SearchPlatform, tuple[SearchRoute, ...]]:
    """Parse SEARCH_ROUTES_JSON into priority-sorted route chains per platform."""
    try:
        raw = json.loads(settings.search_routes_json)
    except json.JSONDecodeError as exc:
        raise AIConfigError(f"SEARCH_ROUTES_JSON is not valid JSON: {exc}") from exc
    if not isinstance(raw, dict):
        raise AIConfigError("SEARCH_ROUTES_JSON must be a JSON object keyed by platform")

    routes: dict[SearchPlatform, tuple[SearchRoute, ...]] = {}
    for key, entries in raw.items():
        try:
            platform = SearchPlatform(key)
        except ValueError as exc:
            raise AIConfigError(f"SEARCH_ROUTES_JSON has unknown platform '{key}'") from exc
        if not isinstance(entries, list) or not entries:
            raise AIConfigError(f"SEARCH_ROUTES_JSON['{key}'] must be a non-empty array")
        try:
            parsed = [SearchRoute.model_validate(entry) for entry in entries]
        except ValidationError as exc:
            raise AIConfigError(
                f"SEARCH_ROUTES_JSON['{key}'] has an invalid route: {exc}"
            ) from exc
        for route in parsed:
            if route.provider not in _KNOWN_PROVIDERS:
                raise AIConfigError(
                    f"SEARCH_ROUTES_JSON['{key}'] references unknown provider "
                    f"'{route.provider}'"
                )
        routes[platform] = tuple(sorted(parsed, key=lambda route: route.priority))
    return routes


def routes_for(platform: SearchPlatform) -> tuple[SearchRoute, ...]:
    routes = get_search_routes().get(platform)
    if not routes:
        raise AIConfigError(f"no search route configured for platform '{platform}'")
    return routes


def validate_search_routes() -> None:
    """Fail fast on a malformed routing table. Parsing is the validation."""
    get_search_routes()
