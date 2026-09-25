"""Signed XKW HTTP client: sign -> send -> normalize envelope -> ledger.

Every attempt (success or failure) writes one qbank_usage_logs row. Only
rate-limit / server / timeout failures are retried (bounded, exponential
backoff); auth / forbidden stop immediately and log at ERROR because retrying
them only burns trial quota.
"""

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable
from typing import Any

import httpx

from qbank.usage import UsageRecord, record_call
from qbank.xkw import envelopes
from qbank.xkw.errors import (
    TERMINAL_ALERT_CODES,
    XKW_MALFORMED,
    XKW_NOT_CONFIGURED,
    XKW_TIMEOUT,
    XkwError,
)
from qbank.xkw.signing import build_signed_headers, serialize_body
from qbank.xkw.types import CallContext, XkwResult

logger = logging.getLogger("lemma.qbank.xkw")

Recorder = Callable[[UsageRecord], Awaitable[None]]

_MAX_RETRIES = 2


class XkwClient:
    def __init__(
        self,
        *,
        app_id: str,
        secret: str,
        base_url: str,
        sign_version: int = 1,
        timeout_s: float = 15,
        http: httpx.AsyncClient | None = None,
        recorder: Recorder | None = record_call,
        backoff_base_s: float = 1.0,
    ) -> None:
        if not app_id or not secret:
            raise XkwError(XKW_NOT_CONFIGURED, "XKW_APP_ID / XKW_SECRET are not set")
        self._app_id = app_id
        self._secret = secret
        self._base_url = base_url.rstrip("/")
        self._sign_version = sign_version
        self._http = http or httpx.AsyncClient(timeout=timeout_s)
        self._owns_http = http is None
        self._recorder = recorder
        self._backoff_base_s = backoff_base_s

    async def aclose(self) -> None:
        if self._owns_http:
            await self._http.aclose()

    async def request(
        self,
        method: str,
        path: str,
        *,
        ctx: CallContext,
        query: dict[str, Any] | None = None,
        body: dict[str, Any] | None = None,
    ) -> XkwResult:
        body_text = serialize_body(body) if body is not None else None
        attempt = 0
        while True:
            try:
                return await self._attempt(method, path, ctx, query, body_text)
            except XkwError as exc:
                if exc.code in TERMINAL_ALERT_CODES:
                    logger.error(
                        "xkw %s %s refused (%s, raw_code=%s): %s",
                        method,
                        path,
                        exc.code,
                        exc.raw_code,
                        exc.message,
                    )
                    raise
                if not exc.retryable or attempt >= _MAX_RETRIES:
                    raise
                attempt += 1
                delay = self._backoff_base_s * (2 ** (attempt - 1))
                logger.warning(
                    "xkw %s %s failed (%s), retry %d in %.1fs",
                    method,
                    path,
                    exc.code,
                    attempt,
                    delay,
                )
                await asyncio.sleep(delay)

    async def _attempt(
        self,
        method: str,
        path: str,
        ctx: CallContext,
        query: dict[str, Any] | None,
        body_text: str | None,
    ) -> XkwResult:
        # One normalized string map is both signed and sent (签哪串就发哪串).
        query_strings = {k: _query_value(v) for k, v in (query or {}).items()}
        signed = build_signed_headers(
            app_id=self._app_id,
            secret=self._secret,
            url_path=path,
            query=query_strings,
            body=body_text,
            version=self._sign_version,
        )
        started = time.monotonic()
        http_status: int | None = None
        try:
            try:
                response = await self._http.request(
                    method,
                    f"{self._base_url}{path}",
                    params=query_strings,
                    content=body_text.encode("utf-8") if body_text else None,
                    headers=signed.headers,
                )
            except httpx.TimeoutException as exc:
                raise XkwError(XKW_TIMEOUT, f"xkw request timed out: {exc}") from exc
            except httpx.TransportError as exc:
                raise XkwError(XKW_TIMEOUT, f"xkw transport error: {exc}") from exc
            http_status = response.status_code
            try:
                payload = response.json()
            except ValueError as exc:
                if http_status >= 400:
                    payload = None
                else:
                    raise XkwError(
                        XKW_MALFORMED, "xkw response is not JSON", http_status=http_status
                    ) from exc
            result = envelopes.normalize(payload, http_status=http_status)
        except XkwError as exc:
            await self._record(
                path,
                ctx,
                started,
                success=False,
                billable=False,
                http_status=http_status or exc.http_status,
                raw_code=exc.raw_code,
                error_type=exc.code,
                request_id=signed.request_id,
            )
            raise
        await self._record(
            path,
            ctx,
            started,
            success=True,
            billable=result.billable,
            http_status=http_status,
            raw_code=result.raw_code,
            result_count=len(result.items),
            request_id=signed.request_id,
            session_id=result.session_id,
        )
        return result

    async def _record(
        self, path: str, ctx: CallContext, started: float, **fields: Any
    ) -> None:
        if self._recorder is None:
            return
        await self._recorder(
            UsageRecord(
                provider="xkw",
                endpoint=path,
                use_case=ctx.use_case,
                trace_id=ctx.trace_id,
                latency_ms=int((time.monotonic() - started) * 1000),
                user_id=ctx.user_id,
                question_set_id=ctx.question_set_id,
                **fields,
            )
        )


def _query_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (list, tuple)):
        return ",".join(str(item) for item in value)
    return str(value)
