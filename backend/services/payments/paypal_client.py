"""Thin httpx facade over the PayPal REST API (Orders v2).

We deliberately do NOT pull in the official PayPal SDK: it lags the API, pulls a
large dependency tree, and is awkward to mock. The surface we need is small and
stable, so a typed facade keeps the rest of the codebase SDK-free and testable.

Token caching: a single bearer token is fetched per process and reused until
~30s before expiry (PayPal tokens last ~9h, but we stay conservative). A lock
serializes the refresh so concurrent requests don't stampede the token endpoint.
"""

import asyncio
import logging
import time

import httpx

from core.config import settings
from dataclasses import dataclass

logger = logging.getLogger("lemma.payments.paypal")


class PayPalError(RuntimeError):
    """Raised for any non-2xx from PayPal or malformed response."""


@dataclass
class OrderResult:
    order_id: str
    approval_url: str | None
    status: str


class PayPalClient:
    def __init__(self) -> None:
        self._base = settings.paypal_api_base
        self._client_id = settings.paypal_client_id
        self._client_secret = settings.paypal_client_secret
        self._token: str | None = None
        self._token_expires_at: float = 0.0
        self._lock: asyncio.Lock | None = None

    # -- auth ---------------------------------------------------------------
    async def _get_token(self) -> str:
        if self._lock is None:
            self._lock = asyncio.Lock()
        async with self._lock:
            if self._token and time.time() < self._token_expires_at - 30:
                return self._token
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{self._base}/v1/oauth2/token",
                    auth=(self._client_id, self._client_secret),
                    data={"grant_type": "client_credentials"},
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
            if resp.status_code != 200:
                raise PayPalError(
                    f"oauth2/token -> {resp.status_code}: {resp.text[:200]}"
                )
            data = resp.json()
            self._token = data["access_token"]
            self._token_expires_at = time.time() + float(data.get("expires_in", 3600))
            return self._token

    # -- orders -------------------------------------------------------------
    async def create_order(self, pack, custom_id: str) -> OrderResult:
        token = await self._get_token()
        body = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": custom_id,
                    "custom_id": custom_id,
                    "description": f"Lemma AI credits — {pack.name}",
                    "amount": {
                        "currency_code": "USD",
                        "value": f"{pack.price_usd:.2f}",
                    },
                }
            ],
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{self._base}/v2/checkout/orders",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}",
                    # Idempotency: a retried create with the same id is safe.
                    "PayPal-Request-Id": custom_id,
                },
                json=body,
            )
        if resp.status_code not in (200, 201):
            raise PayPalError(f"create_order -> {resp.status_code}: {resp.text[:300]}")
        data = resp.json()
        order_id = data["id"]
        approval_url = next(
            (l["href"] for l in data.get("links", []) if l.get("rel") == "approve"),
            None,
        )
        return OrderResult(
            order_id=order_id,
            approval_url=approval_url,
            status=data.get("status", "CREATED"),
        )

    async def capture_order(self, order_id: str) -> dict:
        token = await self._get_token()
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{self._base}/v2/checkout/orders/{order_id}/capture",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}",
                },
            )
        if resp.status_code not in (200, 201):
            raise PayPalError(f"capture -> {resp.status_code}: {resp.text[:300]}")
        return resp.json()

    async def get_order(self, order_id: str) -> dict:
        token = await self._get_token()
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(
                f"{self._base}/v2/checkout/orders/{order_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
        if resp.status_code != 200:
            raise PayPalError(f"get_order -> {resp.status_code}: {resp.text[:300]}")
        return resp.json()

    # -- webhook verification ----------------------------------------------
    async def verify_webhook_signature(
        self,
        *,
        transmission_id: str,
        timestamp: str,
        webhook_id: str,
        event_body: str,
        signature: str,
        cert_url: str,
        algorithm: str = "SHA256withRSA",
    ) -> bool:
        """Ask PayPal to verify a webhook's transmission signature.

        This is the officially recommended verification path: it hands PayPal the
        raw request (transmission id, timestamp, cert url, signature) plus the
        webhook id and the raw event body, and trusts its `verification_status`.
        """
        token = await self._get_token()
        payload = {
            "auth_algorithm": algorithm,
            "transmission_id": transmission_id,
            "cert_url": cert_url,
            "webhook_id": webhook_id,
            "transmission_sig": signature,
            "transmission_time": timestamp,
            "webhook_event": event_body,
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{self._base}/v1/notifications/verify-webhook-signature",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        if resp.status_code != 200:
            logger.warning(
                "verify-webhook-signature -> %s: %s", resp.status_code, resp.text[:200]
            )
            return False
        return resp.json().get("verification_status") == "SUCCESS"
