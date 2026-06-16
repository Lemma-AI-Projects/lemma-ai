"""Video-search providers. Apify is the first; others (official APIs, self-host)
plug in behind the same VideoSearchProvider protocol later."""

from ai.search.providers.base import VideoSearchProvider

__all__ = ["VideoSearchProvider"]
