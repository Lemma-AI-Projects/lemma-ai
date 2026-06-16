"""The ONLY place apify_client may be imported.

Wraps the async Apify client so the rest of ai/search/ deals in neutral shapes:
- build_client() / aclose_client(): caller-owned lifecycle (smoke and the future
  Celery task each build one and close it; we never keep a process-global client
  — search is off the web request path, unlike ai/model_factory's shared client).
- run_actor(): run an actor, return its dataset items plus the two run fields the
  ledger needs (run id, platform-reported cost). Apify's raw Run object never
  leaves this function.

Cost/charge controls (rules 第八/九章 成本硬控): every run is bounded by
max_items, max_total_charge_usd and run_timeout. The Apify client itself does
429/5xx backoff + retries; we layer cross-provider fallback on top in routing.py.

Note (apify-client 3.x, verified by introspection): `.call()` returns a typed
`Run` object (attribute access — `run.default_dataset_id`, not `run["..."]` as
older docs show), `max_total_charge_usd` is typed Decimal, and there is no
public client `close()` (the impit transport frees its pool on GC; we close it
best-effort).
"""

import logging
from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal
from typing import Any

from apify_client import ApifyClientAsync
from apify_client import errors as apify_errors

from ai.errors import AIError, AIProviderError, AIRateLimitError, AITimeoutError
from ai.search.errors import SearchProviderError
from core.config import settings

logger = logging.getLogger("lemma.ai.search")

# Re-exported alias so other ai/search/ modules can type the client handle
# without importing apify_client themselves (keeps the SDK import in this file).
ApifyClient = ApifyClientAsync


@dataclass
class ApifyRunResult:
    """Neutral carrier out of run_actor: dataset items + the run fields the
    provider_usage_logs ledger records. Not a boundary type (stays inside the
    apify package); the public boundary is VideoCandidate."""

    items: list[dict[str, Any]]
    run_id: str | None
    cost_usd: Decimal | None


def build_client() -> ApifyClient:
    token = settings.apify_api_token
    if not token:
        raise SearchProviderError("APIFY_API_TOKEN is not set; cannot run Apify search")
    return ApifyClientAsync(token=token)


async def aclose_client(client: ApifyClient) -> None:
    """Best-effort close. apify-client 3.x has no public close; release the
    underlying impit transport if it exposes the async-context exit. Never raises."""
    transport = getattr(getattr(client, "http_client", None), "_impit_async_client", None)
    aexit = getattr(transport, "__aexit__", None)
    if aexit is None:
        return
    try:
        await aexit(None, None, None)
    except Exception:  # noqa: BLE001 — closing must never break the caller
        logger.debug("apify client close best-effort failed", exc_info=True)


async def run_actor(
    client: ApifyClient,
    actor_id: str,
    run_input: dict[str, Any],
    *,
    max_items: int,
    max_total_charge_usd: float,
    run_timeout_s: float,
    wait_s: float,
) -> ApifyRunResult:
    """Run an actor to completion and collect its dataset items.

    Maps every Apify/transport failure to the AI error family so no SDK
    exception escapes the boundary (mirrors ai/errors.map_framework_error).
    """
    try:
        run = await client.actor(actor_id).call(
            run_input=run_input,
            max_items=max_items,
            max_total_charge_usd=Decimal(str(max_total_charge_usd)),
            run_timeout=timedelta(seconds=run_timeout_s),
            wait_duration=timedelta(seconds=wait_s),
        )
    except Exception as exc:  # noqa: BLE001 — translate at the boundary
        raise _map_apify_error(exc) from exc

    if run is None:
        # The client stopped waiting before the run reached a terminal state.
        raise AITimeoutError("apify run did not finish within the wait window")

    dataset_id = getattr(run, "default_dataset_id", None)
    if not dataset_id:
        raise SearchProviderError("apify run returned no dataset")

    try:
        items = [item async for item in client.dataset(dataset_id).iterate_items()]
    except Exception as exc:  # noqa: BLE001 — translate at the boundary
        raise _map_apify_error(exc) from exc

    cost = getattr(run, "usage_total_usd", None)
    return ApifyRunResult(
        items=items,
        run_id=getattr(run, "id", None),
        cost_usd=Decimal(str(cost)) if cost is not None else None,
    )


def _map_apify_error(exc: Exception) -> AIError:
    """Apify/transport exception -> AI error family (retryability per rules 第五/八章).

    Retryable (fall back to the next provider): rate limit, 5xx, timeout,
    transport/parse blips. Terminal (no fallback): 4xx input/auth/not-found,
    surfaced as SearchProviderError.
    """
    if isinstance(exc, AIError):
        return exc
    if isinstance(exc, apify_errors.RateLimitError):
        return AIRateLimitError("apify rate limited the search request", raw=exc)
    if isinstance(exc, apify_errors.ServerError):
        return AIProviderError("apify returned a server error", raw=exc)
    if isinstance(exc, apify_errors.ApifyApiError):
        # Remaining API errors are 4xx (invalid input / auth / not found /
        # conflict) — terminal, retrying elsewhere won't help.
        return SearchProviderError(f"apify rejected the search request: {exc}", raw=exc)
    if isinstance(exc, apify_errors.ApifyClientError):
        # Non-API client errors (e.g. malformed response body) — transient.
        return AIProviderError("apify client error during search", raw=exc)
    if isinstance(exc, TimeoutError):
        return AITimeoutError("apify search timed out", raw=exc)
    return AIProviderError("unexpected apify search failure", raw=exc)
