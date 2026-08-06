"""Payments API: config probe, balance, create-order, capture.

Contract matches frontend src/features/payments/*:
- GET  /payments/config   -> { paypalReady, currency }
- GET  /payments/balance   -> { credits }
- POST /payments/orders    -> { orderId }   (body: { packId, amount, currency })
- POST /payments/capture   -> { orderId, status, creditsGranted? }

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
from services.payments.fulfillment import finalize_payment_capture
from services.payments.paypal_client import PayPalClient, PayPalError
from services.payments.pricing import get_pack

router = APIRouter(prefix="/payments", tags=["payments"])

# One shared client per process (token cache lives on the instance).
_client = PayPalClient()


@router.get("/config", response_model=PaymentConfigResponse)
async def payments_config() -> PaymentConfigResponse:
    return PaymentConfigResponse(paypal_ready=settings.paypal_ready, currency="USD")


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
    if not settings.paypal_ready:
        raise HTTPException(status_code=503, detail="payments_unavailable")

    pack = get_pack(req.pack_id)
    if pack is None:
        raise HTTPException(status_code=400, detail="unknown_pack")

    # Server-authoritative pricing: the client `amount` is intentionally ignored.
    try:
        result = await _client.create_order(
            pack, custom_id=f"{current_user.id}:{req.pack_id}"
        )
    except PayPalError as exc:
        raise HTTPException(status_code=502, detail=f"paypal_error: {exc}") from exc

    from models.payment import Payment

    payment = Payment(
        user_id=current_user.id,
        pack_id=pack.id,
        credits=pack.credits,
        amount_usd=Decimal(str(pack.price_usd)),
        currency="USD",
        paypal_order_id=result.order_id,
        status="created",
    )
    db.add(payment)
    await db.commit()
    return CreateOrderResponse(order_id=result.order_id)


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
        select(Payment).where(Payment.paypal_order_id == order_id)
    )
    if existing is None:
        raise HTTPException(status_code=404, detail="order_not_found")

    try:
        paypal_data = await _client.capture_order(order_id)
    except PayPalError as exc:
        raise HTTPException(status_code=502, detail=f"paypal_error: {exc}") from exc

    paypal_status = paypal_data.get("status", "")
    payer_id = (paypal_data.get("payer") or {}).get("payer_id")
    granted, credits = await finalize_payment_capture(
        db, order_id, paypal_status=paypal_status, payer_id=payer_id
    )
    await db.commit()

    return CaptureOrderResponse(
        order_id=order_id,
        status=paypal_status or "COMPLETED",
        credits_granted=credits if granted else None,
    )
