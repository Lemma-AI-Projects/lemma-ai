"""Inbound PayPal webhooks.

PayPal POSTs here on payment events. This is the *final-consistency* backstop for
the capture endpoint: if the frontend's capture call fails after PayPal already
captured the funds, the PAYMENT.CAPTURE.COMPLETED webhook still grants the credits
idempotently (the payment row is already `captured`, so it's a no-op on replay).

No auth: PayPal is the only caller. We verify the transmission signature when a
webhook id is configured, and always record each event once so replays are safe.

NOTE: PayPal webhooks only reach publicly routable HTTPS URLs. In local dev the
endpoint can't be reached; the capture-endpoint path is the primary one there.
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

    paypal_event_id = event.get("id", "")
    event_type = event.get("event_type", "")

    # Idempotency: a seen event id is acknowledged with 200 (PayPal stops
    # retrying) without re-processing.
    already = await db.scalar(
        select(PaymentWebhookEvent).where(
            PaymentWebhookEvent.paypal_event_id == paypal_event_id
        )
    )
    if already is not None:
        return Response(status_code=200)

    event_row = PaymentWebhookEvent(
        provider="paypal",
        paypal_event_id=paypal_event_id,
        event_type=event_type,
        status="received",
    )

    # Verify signature unless no webhook id is configured (local/dev).
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
            # 200 so PayPal stops retrying a bad signature; we've logged it.
            return Response(status_code=200)

    # Best-effort extraction of the order id from capture/order events.
    resource = event.get("resource") or {}
    order_id = (
        (resource.get("supplementary_data") or [{}])[0]
        .get("related_ids", {})
        .get("order_id")
        or resource.get("order_id")
    )
    event_row.resource_order_id = order_id

    if event_type == "PAYMENT.CAPTURE.COMPLETED" and order_id:
        await finalize_payment(
            db, "paypal", order_id, status="COMPLETED"
        )
        event_row.status = "processed"
        event_row.processed_at = datetime.now(timezone.utc)
    elif event_type == "CHECKOUT.ORDER.APPROVED" and order_id:
        # Approved but not yet captured; let the capture event drive fulfillment.
        event_row.status = "processed"

    db.add(event_row)
    await db.commit()
    return Response(status_code=200)


@router.post("/stripe")
async def stripe_webhook(
    request: Request, db: AsyncSession = Depends(get_db)
) -> Response:
    """Inbound Stripe webhooks (card checkout finalization).

    Stripe signs every payload with `stripe-signature`; we verify it when a
    webhook secret is configured. On checkout.session.completed with
    payment_status=paid we finalize the local Payment row idempotently — replay
    safety is the same as PayPal (row lock + forward-only status machine).
    """
    import stripe  # lazy: channel disabled until a key is configured

    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, signature, settings.stripe_webhook_secret
        )
    except Exception as exc:  # ValueError / SignatureVerificationError
        logger.warning("stripe webhook verify error: %s", exc)
        return Response(status_code=400)

    event_id = event.get("id", "")
    event_type = event.get("type", "")

    # Idempotency: a seen event id is acknowledged without re-processing.
    already = await db.scalar(
        select(PaymentWebhookEvent).where(
            PaymentWebhookEvent.paypal_event_id == event_id
        )
    )
    if already is not None:
        return Response(status_code=200)

    event_row = PaymentWebhookEvent(
        provider="stripe",
        paypal_event_id=event_id,
        event_type=event_type,
        status="received",
    )

    session = (event.get("data") or {}).get("object") or {}
    session_id = session.get("id", "")
    event_row.resource_order_id = session_id

    if event_type == "checkout.session.completed" and session_id:
        # Only grant when payment actually succeeded (async payments can arrive
        # unpaid). Session id is the provider order id we stored at creation.
        if session.get("payment_status") == "paid":
            await finalize_payment(
                db, "stripe", session_id, status="COMPLETED"
            )
            event_row.status = "processed"
            event_row.processed_at = datetime.now(timezone.utc)
        else:
            event_row.status = "processed"
            event_row.detail = f"payment_status={session.get('payment_status')}"

    db.add(event_row)
    await db.commit()
    return Response(status_code=200)
