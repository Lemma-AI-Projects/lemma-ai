"""The provider interface: one method, many implementations.

Any future provider (YouTube Data API, a self-hosted Bilibili scraper, …) only
has to implement search(); the routing layer treats them all the same and can
fall back across them.
"""

from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol

from ai.search.types import VideoCandidate, VideoSearchQuery


@dataclass
class ProviderRunMeta:
    """Neutral run metadata routing reads off ``provider.last_run`` to bill a
    call (provider_usage_logs). Two fields only — run_id and cost_usd — so any
    provider can expose it: Apify's ApifyRunResult is structurally compatible
    (same attrs), and free self-built providers set cost_usd=0 / run_id=None.
    routing reads it duck-typed, so this is the contract, not a base class.
    """

    run_id: str | None = None
    cost_usd: Decimal | None = None


class VideoSearchProvider(Protocol):
    async def search(
        self, query: VideoSearchQuery, *, limit: int
    ) -> list[VideoCandidate]: ...
