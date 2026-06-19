"""Bilibili HTTP client + WBI key cache + per-event-loop lifecycle.

The ONLY module in providers/bilibili that touches the network. Anonymous (no
cookie — verified 2026-06-19 that injecting visitor cookies triggers v_voucher
empty results), with a browser UA + Referer. One BiliClient is cached per
running event loop (id(loop)) so a build reuses it across chapters; the web
process (long-lived loop) and each Celery task (own asyncio.run loop) get
distinct instances and close theirs via aclose_search_clients() — mirroring the
engine-per-task discipline in tasks/course_build.py (httpx clients are loop-
bound; sharing one across loops is the same hazard as the DB engine). Every
transport/HTTP failure maps to the AI error family so no raw httpx exception
escapes run_search_chain.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx

from ai.errors import AIProviderError, AIRateLimitError, AITimeoutError
from ai.search.errors import SearchProviderError
from ai.search.providers.bilibili import wbi

_NAV_URL = "https://api.bilibili.com/x/web-interface/nav"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.bilibili.com/",
    "Accept": "application/json, text/plain, */*",
}
_TIMEOUT_S = 15.0
# WBI keys rotate ~daily; refresh comfortably within that window.
_WBI_TTL_S = 6 * 3600


class BiliClient:
    """Reusable httpx client + WBI key cache (one per event loop)."""

    def __init__(self) -> None:
        # Synchronous construction (no await) so get-or-create stays race-safe
        # without a lock (the only await points are inside the methods below).
        self._http = httpx.AsyncClient(
            headers=_HEADERS, timeout=httpx.Timeout(_TIMEOUT_S)
        )
        self._wbi: tuple[str, str] | None = None
        self._wbi_at: float = 0.0
        self._wbi_lock = asyncio.Lock()

    async def get_json(self, url: str, params: dict[str, Any]) -> dict[str, Any]:
        """GET + parse JSON, mapping every transport/HTTP failure to AIError."""
        try:
            response = await self._http.get(url, params=params)
        except httpx.TimeoutException as exc:
            raise AITimeoutError("bilibili request timed out", raw=exc) from exc
        except httpx.HTTPError as exc:
            raise AIProviderError("bilibili request failed", raw=exc) from exc
        status = response.status_code
        if status == 412:
            raise AIRateLimitError("bilibili risk control (HTTP 412)", raw=status)
        if status == 429:
            raise AIRateLimitError("bilibili rate limited", raw=status)
        if status >= 500:
            raise AIProviderError(f"bilibili HTTP {status}", raw=status)
        if status >= 400:
            raise SearchProviderError(f"bilibili HTTP {status}")
        try:
            return response.json()
        except ValueError as exc:
            raise AIProviderError("bilibili returned non-JSON", raw=exc) from exc

    async def get_wbi_keys(self) -> tuple[str, str]:
        """(img_key, sub_key) from nav, cached behind a lock against concurrent nav."""
        if self._fresh():
            return self._wbi  # type: ignore[return-value]
        async with self._wbi_lock:
            if self._fresh():
                return self._wbi  # type: ignore[return-value]
            data = await self.get_json(_NAV_URL, {})
            try:
                keys = wbi.keys_from_nav(data)
            except ValueError as exc:
                raise AIProviderError(str(exc), raw=exc) from exc
            self._wbi = keys
            self._wbi_at = time.monotonic()
            return keys

    def _fresh(self) -> bool:
        return self._wbi is not None and (time.monotonic() - self._wbi_at) < _WBI_TTL_S

    async def aclose(self) -> None:
        await self._http.aclose()


# One client per running event loop. Created lazily (sync, race-safe: no await
# between the lookup and the store inside a single-threaded loop).
_clients: dict[int, BiliClient] = {}


def get_bili_client() -> BiliClient:
    """The current loop's BiliClient, created on first use."""
    loop_id = id(asyncio.get_running_loop())
    client = _clients.get(loop_id)
    if client is None:
        client = BiliClient()
        _clients[loop_id] = client
    return client


async def aclose_search_clients() -> None:
    """Close + drop the current loop's self-built search client(s).

    Called from tasks/course_build.py's finally (worker, per task) and the
    FastAPI lifespan shutdown (web). Only the current loop's instance is touched
    — closing a client bound to another loop would error.
    """
    loop_id = id(asyncio.get_running_loop())
    client = _clients.pop(loop_id, None)
    if client is not None:
        await client.aclose()
