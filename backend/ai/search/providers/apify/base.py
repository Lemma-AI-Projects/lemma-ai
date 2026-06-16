"""Shared run+map skeleton for Apify-backed search providers.

Subclasses supply only the two actor-specific bits: how to build the run_input
and how to map one dataset item to a VideoCandidate. Everything else — cost
bounds, calling the actor, error-item skipping, slicing to the requested limit,
and stashing the run's id/cost for the ledger — lives here once.
"""

from ai.search.providers.apify.client import (
    ApifyClient,
    ApifyRunResult,
    run_actor,
)
from ai.search.types import SearchPlatform, VideoCandidate, VideoSearchQuery

# The Apify client waits this much longer than the actor's own run_timeout, so a
# self-aborting run is collected (terminal) instead of the wait expiring first
# (which would bill the run yet return nothing).
_WAIT_BUFFER_S = 30.0


class ApifyVideoSearchProvider:
    provider_name: str
    platform: SearchPlatform

    def __init__(self, client: ApifyClient, route, ctx) -> None:
        self._client = client
        self._route = route
        self._ctx = ctx
        # Read by routing.py after the call to bill the run (id + cost). Set on
        # a successful actor run, even if mapping yields zero candidates.
        self.last_run: ApifyRunResult | None = None

    def _build_run_input(self, query: VideoSearchQuery, *, max_items: int) -> dict:
        raise NotImplementedError

    def _to_candidate(self, item: dict) -> VideoCandidate | None:
        raise NotImplementedError

    async def search(
        self, query: VideoSearchQuery, *, limit: int
    ) -> list[VideoCandidate]:
        # Never fetch more than asked, never more than the per-route cost cap.
        effective = max(1, min(limit, self._route.max_items))
        result = await run_actor(
            self._client,
            self._route.actor_id,
            self._build_run_input(query, max_items=effective),
            max_items=effective,
            max_total_charge_usd=self._route.max_total_charge_usd,
            run_timeout_s=self._route.timeout_s,
            wait_s=self._route.timeout_s + _WAIT_BUFFER_S,
        )
        self.last_run = result
        candidates: list[VideoCandidate] = []
        for item in result.items:
            candidate = self._to_candidate(item)
            if candidate is not None:  # skip error items / malformed rows
                candidates.append(candidate)
        return candidates[:limit]
