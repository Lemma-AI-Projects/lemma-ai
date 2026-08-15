"""Credits API: balance + consumption history.

Contract matches frontend src/features/payments/*:
- GET /credits/balance -> { credits }
- GET /credits/ledger   -> { items: [{ id, delta, balanceAfter, reason, createdAt }] }

The balance endpoint is the canonical read for the whole app (sidebar, chat
gates, pay page). The ledger endpoint powers the consumption history view.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user
from models.payment import CreditLedger
from services.credits.ledger import get_balance
from services.user_service import get_or_create_profile

router = APIRouter(prefix="/credits", tags=["credits"])


class _CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class BalanceResponse(_CamelModel):
    credits: int


class LedgerItem(_CamelModel):
    id: uuid.UUID
    delta: int
    balance_after: int
    reason: str
    created_at: str


class LedgerResponse(_CamelModel):
    items: list[LedgerItem]


@router.get("/balance", response_model=BalanceResponse)
async def read_balance(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BalanceResponse:
    # Ensure the profile (and its signup bonus) exists before reading, so a
    # brand-new user sees their 500 free credits instead of a 0.
    await get_or_create_profile(
        db, user_id=current_user.id, email=current_user.email
    )
    balance = await get_balance(db, current_user.id)
    return BalanceResponse(credits=balance)


@router.get("/ledger", response_model=LedgerResponse)
async def read_ledger(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LedgerResponse:
    rows = await db.scalars(
        select(CreditLedger)
        .where(CreditLedger.user_id == current_user.id)
        .order_by(CreditLedger.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    items = [
        LedgerItem(
            id=row.id,
            delta=row.delta,
            balance_after=row.balance_after,
            reason=row.reason,
            created_at=row.created_at.isoformat(),
        )
        for row in rows
    ]
    return LedgerResponse(items=items)