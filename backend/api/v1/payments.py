"""Payments API: config probe, balance, create-order, capture.

Contract matches frontend src/features/payments/*:
- GET  /payments/config   -> { paypalReady, stripeReady, currency }
- GET  /payments/balance   -> { credits }
- POST /payments/orders    -> { orderId, url? }  (body: { packId, provider, ... })
- POST /payments/capture   -> { orderId, status, creditsGranted? }  (PayPal only)

Providers (2026-08-06, multi-channel):
- "paypal" — embedded JS SDK; the frontend captures after approval.
- "stripe" — hosted Checkout Session; the frontend redirects to `url`, and the
  /webhooks/stripe endpoint finalizes on checkout.session.completed.

Money is server-authoritative: the create endpoint recomputes price/credits from
the pack id and ignores any client-supplied amount.
"""

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.security import CurrentUser, get_current_user
from schemas.payment import (
    BalanceResponse,
    CaptureOrderRequest,
    CaptureOrderResponse,
    CreateOrderRequest,
    CreateOrderResponse,
    PaymentConfigResponse,
)
from services.payments.fulfillment import finalize_payment
from services.payments.paypal_client import PayPalClient, PayPalError
from services.payments.pricing import get_pack
from services.payments.stripe_client import StripeClient, StripeError

router = APIRouter(prefix="/payments", tags=["payments"])

# One shared client per process (token cache lives on the instance).
_paypal = PayPalClient()


def _stripe() -> StripeClient:
    # Built lazily so the module imports even when Stripe is disabled.
    return StripeClient()


@router.get("/config", response_model=PaymentConfigResponse)
async def payments_config() -> PaymentConfigResponse:
    return PaymentConfigResponse(
        paypal_ready=settings.paypal_ready,
        stripe_ready=settings.stripe_ready,
        currency="USD",
    )


@router.get("/balance", response_model=BalanceResponse)
async def read_balance(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BalanceResponse:
    from services.user_service import get_or_create_profile

    profile = await get_or_create_profile(
        db, user_id=current_user.id, email=current_user.email
    )
    return BalanceResponse(credits=profile.credits_balance)


@router.post("/orders", response_model=CreateOrderResponse)
async def create_order(
    req: CreateOrderRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CreateOrderResponse:
    if req.provider == "stripe" and not settings.stripe_ready:
        raise HTTPException(status_code=503, detail="payments_unavailable")
    if req.provider == "paypal" and not settings.paypal_ready:
        raise HTTPException(status_code=503, detail="payments_unavailable")
    if req.provider not in ("paypal", "stripe"):
        raise HTTPException(status_code=400, detail="unknown_provider")

    pack = get_pack(req.pack_id)
    if pack is None:
        raise HTTPException(status_code=400, detail="unknown_pack")

    custom_id = f"{current_user.id}:{req.pack_id}"

    if req.provider == "paypal":
        try:
            result = await _paypal.create_order(pack, custom_id=custom_id)
        except PayPalError as exc:
            raise HTTPException(status_code=502, detail=f"paypal_error: {exc}") from exc
        order_id, checkout_url = result.order_id, None
    else:
        try:
            checkout = _stripe().create_checkout_session(pack, custom_id=custom_id)
        except StripeError as exc:
            raise HTTPException(status_code=502, detail=f"stripe_error: {exc}") from exc
        order_id, checkout_url = checkout.session_id, checkout.url

    from models.payment import Payment

    payment = Payment(
        user_id=current_user.id,
        pack_id=pack.id,
        credits=pack.credits,
        amount_usd=Decimal(str(pack.price_usd)),
        currency="USD",
        provider=req.provider,
        provider_order_id=order_id,
        # Back-compat: the PayPal channel still mirrors its id into the legacy
        # column so old tooling/rollback queries keep working.
        paypal_order_id=order_id if req.provider == "paypal" else None,
        status="created",
    )
    db.add(payment)
    await db.commit()
    return CreateOrderResponse(order_id=order_id, url=checkout_url)


@router.post("/capture", response_model=CaptureOrderResponse)
async def capture(
    body: CaptureOrderRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CaptureOrderResponse:
    order_id = body.order_id
    if not order_id:
        raise HTTPException(status_code=400, detail="order_id_required")

    # Guard: only finalize orders we actually created. Prevents charging a
    # PayPal order that has no local record (defensive — capture is idempotent
    # on PayPal's side anyway).
    from models.payment import Payment

    existing = await db.scalar(
        select(Payment).where(
            Payment.provider == "paypal",
            Payment.provider_order_id == order_id,
        )
    )
    if existing is None:
        raise HTTPException(status_code=404, detail="order_not_found")

    try:
        paypal_data = await _paypal.capture_order(order_id)
    except PayPalError as exc:
        raise HTTPException(status_code=502, detail=f"paypal_error: {exc}") from exc

    paypal_status = paypal_data.get("status", "")
    payer_id = (paypal_data.get("payer") or {}).get("payer_id")
    granted, credits = await finalize_payment(
        db,
        "paypal",
        order_id,
        status=paypal_status,
        payer_id=payer_id,
    )
    await db.commit()

    return CaptureOrderResponse(
        order_id=order_id,
        status=paypal_status or "COMPLETED",
        credits_granted=credits if granted else None,
    )
