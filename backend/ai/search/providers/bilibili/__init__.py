"""Bilibili official Web search provider (self-built, free, anonymous).

httpx + WBI live only inside this package (client.py / wbi.py); the rest of
ai/search/ sees BiliSearchProvider and the boundary VideoCandidate.
"""

from ai.search.providers.bilibili.client import (
    BiliClient,
    aclose_search_clients,
    get_bili_client,
)
from ai.search.providers.bilibili.provider import BiliSearchProvider, to_candidate

__all__ = [
    "BiliClient",
    "BiliSearchProvider",
    "aclose_search_clients",
    "get_bili_client",
    "to_candidate",
]
