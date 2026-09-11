"""Inbound PayPal webhooks.

PayPal POSTs here on payment events. This is the *final-consistency* backstop
for the capture endpoint: if the frontend's capture call fails after PayPal has
already taken the money, the PAYMENT.CAPTURE.COMPLETED event still grants the
credits idempotently (the payment row is already `captured`, so a replay is a
no-op).

No auth: PayPal is the only caller. The transmission signature is verified
whenever a webhook id is configured, and every event is recorded once so replays
stay safe.

NOTE: PayPal only reaches publicly routable HTTPS URLs. Locally the endpoint is
unreachable — use a tunnel (or a deployed host) when configuring the webhook in
the PayPal dashboard. The capture endpoint is the primary path in dev.
"""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from models.payment import PaymentWebhookEvent
from services.payments.fulfillment import finalize_payment
from services.payments.paypal_client import PayPalClient, PayPalError

logger = logging.getLogger("lemma.payments.webhooks")
router = APIRouter(prefix="/webhooks", tags=["webhooks"])

_client = PayPalClient()


@router.post("/paypal")
async def paypal_webhook(
    request: Request, db: AsyncSession = Depends(get_db)
) -> Response:
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8")
    headers = request.headers

    transmission_id = headers.get("paypal-transmission-id", "")
    timestamp = headers.get("paypal-transmission-time", "")
    signature = headers.get("paypal-transmission-sig", "")
    cert_url = headers.get("paypal-cert-url", "")
    algorithm = headers.get("paypal-auth-algo", "SHA256withRSA")

    try:
        event = json.loads(body_str)
    except json.JSONDecodeError:
        return Response(status_code=400)

    provider_event_id = event.get("id", "")
    event_type = event.get("event_type", "")

    # Idempotency: a seen event id is acknowledged with 200 (PayPal stops
    # retrying) without re-processing.
    already = await db.scalar(
        select(PaymentWebhookEvent).where(
            PaymentWebhookEvent.provider_event_id == provider_event_id
        )
    )
    if already is not None:
        return Response(status_code=200)

    event_row = PaymentWebhookEvent(
        provider="paypal",
        provider_event_id=provider_event_id,
        event_type=event_type,
        status="received",
    )

    # Verify the signature unless no webhook id is configured (local/dev).
    if settings.paypal_webhook_id:
        try:
            ok = await _client.verify_webhook_signature(
                transmission_id=transmission_id,
                timestamp=timestamp,
                webhook_id=settings.paypal_webhook_id,
                event_body=body_str,
                signature=signature,
                cert_url=cert_url,
                algorithm=algorithm,
            )
        except PayPalError as exc:
            logger.warning("webhook verify error: %s", exc)
            ok = False
        if not ok:
            event_row.status = "error"
            event_row.detail = "signature verification failed"
            db.add(event_row)
            await db.commit()
            # 200 so PayPal stops retrying a bad signature; we logged it.
            return Response(status_code=200)

    # Best-effort extraction of the order id from capture/order events.
    resource = event.get("resource") or {}
    related = (resource.get("supplementary_data") or {}).get("related_ids") or {}
    order_id = related.get("order_id") or resource.get("order_id")
    event_row.resource_order_id = order_id

    if event_type == "PAYMENT.CAPTURE.COMPLETED" and order_id:
        await finalize_payment(db, "paypal", order_id, status="COMPLETED")
        event_row.status = "processed"
        event_row.processed_at = datetime.now(timezone.utc)
    elif event_type == "CHECKOUT.ORDER.APPROVED" and order_id:
        # Approved but not yet captured; the capture event drives fulfillment.
        event_row.status = "processed"

    db.add(event_row)
    await db.commit()
    return Response(status_code=200)
