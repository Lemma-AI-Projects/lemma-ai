"""Idempotent credit fulfillment for completed PayPal captures.

The hard requirement: credits are granted EXACTLY ONCE per PayPal order, no matter
how many times the capture endpoint is retried or how many duplicate webhooks
arrive. We guarantee this with a row lock on the `payments` row plus a forward-only
status state machine:

- a payment already `captured` is a no-op (returns granted=False);
- only a `COMPLETED` PayPal capture flips it to `captured` and grants credits;
- a non-completed capture (e.g. PENDING/APPROVED) is parked as `approved` and
  left for the webhook to finalize later.

Both the capture endpoint and the webhook call `finalize_payment_capture`, so the
two paths can never double-grant.
"""

import random
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.payment import CreditLedger, Payment
from models.profile import Profile

# Mirror user_service.AVATAR_PALETTE so a profile created here looks identical.
_AVATAR_PALETTE = (
    "#FF8F50",
    "#A855F7",
    "#0EA5E9",
    "#22C55E",
    "#F43F5E",
    "#EAB308",
    "#6366F1",
    "#14B8A6",
)


async def _grant_credits(
    db: AsyncSession,
    user_id: uuid.UUID,
    credits: int,
    reason: str,
    payment_id: uuid.UUID,
) -> int:
    """Add `credits` to the user's balance under a row lock; returns new balance.

    Creates the profile if it somehow doesn't exist yet (it normally does, because
    it's provisioned on first login), without committing — the caller's outer
    transaction owns the commit.
    """
    profile = await db.get(Profile, user_id, with_for_update=True)
    if profile is None:
        profile = Profile(
            id=user_id,
            email="",
            nickname=None,
            subscription_plan="free",
            avatar_color=random.choice(_AVATAR_PALETTE),
            credits_balance=0,
        )
        db.add(profile)
    new_balance = profile.credits_balance + credits
    profile.credits_balance = new_balance
    db.add(
        CreditLedger(
            user_id=user_id,
            delta=credits,
            balance_after=new_balance,
            reason=reason,
            payment_id=payment_id,
        )
    )
    return new_balance


async def finalize_payment_capture(
    db: AsyncSession,
    paypal_order_id: str,
    *,
    paypal_status: str,
    payer_id: str | None = None,
) -> tuple[bool, int]:
    """Mark a Payment captured and grant credits, idempotently.

    Returns (granted_this_call, credits_granted). `granted_this_call` is False when
    the payment was already captured (replay) or when PayPal hasn't reported
    COMPLETED yet.
    """
    pay = await db.scalar(
        select(Payment)
        .where(Payment.paypal_order_id == paypal_order_id)
        .with_for_update()
    )
    if pay is None:
        return (False, 0)
    if pay.status == "captured":
        return (False, pay.credits)
    if paypal_status != "COMPLETED":
        # PENDING / APPROVED: park it; the webhook will finalize on COMPLETED.
        pay.status = "approved"
        return (False, 0)

    pay.status = "captured"
    pay.paypal_payer_id = payer_id
    pay.captured_at = datetime.now(timezone.utc)
    new_balance = await _grant_credits(
        db, pay.user_id, pay.credits, f"purchase:{pay.id}", pay.id
    )
    return (True, pay.credits)
