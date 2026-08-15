"""Idempotent credit fulfillment for completed payment captures.

The hard requirement: credits are granted EXACTLY ONCE per provider order, no
matter how many times the capture endpoint is retried or how many duplicate
webhooks arrive. We guarantee this with a row lock on the `payments` row plus a
forward-only status state machine:

- a payment already `captured` is a no-op (returns granted=False);
- only a `COMPLETED` capture flips it to `captured` and grants credits;
- a non-completed capture (e.g. PENDING/APPROVED) is parked as `approved` and
  left for the webhook to finalize later.

Both the capture endpoint and the webhooks (PayPal + Stripe) call
`finalize_payment`, so the paths can never double-grant.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.payment import Payment
from services.credits.ledger import grant_credits


async def finalize_payment(
    db: AsyncSession,
    provider: str,
    provider_order_id: str,
    *,
    status: str,
    payer_id: str | None = None,
) -> tuple[bool, int]:
    """Mark a Payment captured and grant credits, idempotently.

    Works for any provider ("paypal" | "stripe"): the row is located by
    (provider, provider_order_id). Returns (granted_this_call, credits_granted).
    `granted_this_call` is False when the payment was already captured (replay)
    or when the provider hasn't reported COMPLETED yet.
    """
    pay = await db.scalar(
        select(Payment)
        .where(
            Payment.provider == provider,
            Payment.provider_order_id == provider_order_id,
        )
        .with_for_update()
    )
    if pay is None:
        return (False, 0)
    if pay.status == "captured":
        return (False, pay.credits)
    if status != "COMPLETED":
        # PENDING / APPROVED: park it; the webhook will finalize on COMPLETED.
        pay.status = "approved"
        return (False, 0)

    pay.status = "captured"
    if payer_id is not None:
        pay.paypal_payer_id = payer_id
    pay.captured_at = datetime.now(timezone.utc)
    await grant_credits(
        db,
        pay.user_id,
        pay.credits,
        "purchase",
        ref_id=str(pay.id),
    )
    return (True, pay.credits)
