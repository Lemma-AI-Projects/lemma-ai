"""Payments API: config probe, create-order, capture.

Contract matches the frontend's src/features/payments/*:
- GET  /payments/config   -> { paypalReady, stripeReady, currency }
- POST /payments/orders   -> { orderId, url? }   (body: { packId, provider })
- POST /payments/capture  -> { orderId, status, creditsGranted? }

PayPal is the only live channel on this branch: Stripe is stubbed out
(`settings.stripe_ready` is always False) so the client keeps the card button
disabled.

Money is server-authoritative: create recomputes price and credits from the pack
id and ignores any client-supplied amount.
"""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.security import CurrentUser, get_current_user
from models.payment import Payment
from schemas.payment import (
    CaptureOrderRequest,
    CaptureOrderResponse,
    CreateOrderRequest,
    CreateOrderResponse,
    PaymentConfigResponse,
)
from services.payments.fulfillment import finalize_payment
from services.payments.paypal_client import PayPalClient, PayPalError
from services.payments.pricing import get_pack

router = APIRouter(prefix="/payments", tags=["payments"])

# One shared client per process (the token cache lives on the instance).
_paypal = PayPalClient()


@router.get("/config", response_model=PaymentConfigResponse)
async def payments_config() -> PaymentConfigResponse:
    return PaymentConfigResponse(
        paypal_ready=settings.paypal_ready,
        stripe_ready=settings.stripe_ready,
        currency="USD",
    )


@router.post("/orders", response_model=CreateOrderResponse)
async def create_order(
    req: CreateOrderRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CreateOrderResponse:
    if req.provider != "paypal":
        # The card channel arrives with the Stripe work; until then, refuse
        # rather than silently creating a PayPal order for a Stripe request.
        raise HTTPException(status_code=400, detail="unknown_provider")
    if not settings.paypal_ready:
        raise HTTPException(status_code=503, detail="payments_unavailable")

    pack = get_pack(req.pack_id)
    if pack is None:
        raise HTTPException(status_code=400, detail="unknown_pack")

    custom_id = f"{current_user.id}:{req.pack_id}"

    try:
        result = await _paypal.create_order(pack, custom_id=custom_id)
    except PayPalError as exc:
        raise HTTPException(status_code=502, detail=f"paypal_error: {exc}") from exc

    db.add(
        Payment(
            user_id=current_user.id,
            pack_id=pack.id,
            credits=pack.credits,
            amount_usd=Decimal(str(pack.price_usd)),
            currency="USD",
            provider="paypal",
            provider_order_id=result.order_id,
            status="created",
        )
    )
    await db.commit()
    return CreateOrderResponse(order_id=result.order_id, url=None)


@router.post("/capture", response_model=CaptureOrderResponse)
async def capture(
    body: CaptureOrderRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CaptureOrderResponse:
    order_id = body.order_id
    if not order_id:
        raise HTTPException(status_code=400, detail="order_id_required")

    # Only finalize orders we actually created — prevents capturing a PayPal
    # order that has no local record (defensive; capture is idempotent on
    # PayPal's side too). Also scopes the order to its owner.
    existing = await db.scalar(
        select(Payment).where(
            Payment.provider == "paypal",
            Payment.provider_order_id == order_id,
        )
    )
    if existing is None or existing.user_id != current_user.id:
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
