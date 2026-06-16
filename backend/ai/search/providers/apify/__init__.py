"""Apify-backed search providers + the SDK wrapper. apify_client is imported
only inside this package (client.py)."""

from ai.search.providers.apify.bilibili import ApifyBilibiliProvider
from ai.search.providers.apify.client import (
    ApifyClient,
    ApifyRunResult,
    aclose_client,
    build_client,
    run_actor,
)
from ai.search.providers.apify.youtube import ApifyYouTubeProvider

__all__ = [
    "ApifyBilibiliProvider",
    "ApifyClient",
    "ApifyRunResult",
    "ApifyYouTubeProvider",
    "aclose_client",
    "build_client",
    "run_actor",
]
