"""Credit ledger operations: grant, deduct, and query balance.

Pricing rule (拍板 2026-08-14): 1 credit = $0.01 USD of AI cost. Conversions
always round UP so the platform never loses money on fractional-cent costs.
"""

import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from models.payment import CreditLedger
from models.profile import Profile


class InsufficientCredits(Exception):
    """Raised when a user doesn't have enough credits for an operation."""

    def __init__(self, *, user_id: uuid.UUID, required: int, balance: int) -> None:
        self.user_id = user_id
        self.required = required
        self.balance = balance
        super().__init__(f"user {user_id} needs {required} credits but has {balance}")


def usd_to_credits(cost_usd: Decimal | None) -> int:
    """Convert a USD cost to whole credits (1 credit = $0.01, ceil).

    Returns 0 for None/zero costs — tracking-only rows (failed attempts, free
    tiers) must not trigger a deduction.
    """
    if cost_usd is None or cost_usd <= 0:
        return 0
    credits = int((cost_usd * 100).to_integral_value(rounding="ROUND_CEILING"))
    return max(credits, 1)


async def get_balance(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Current credits balance; 0 when the profile doesn't exist yet."""
    profile = await db.get(Profile, user_id)
    return profile.credits_balance if profile is not None else 0


async def grant_credits(
    db: AsyncSession,
    user_id: uuid.UUID,
    credits: int,
    reason: str,
    *,
    ref_id: str | None = None,
) -> int:
    """Add `credits` under a row lock; returns the new balance.

    The caller owns the commit. `ref_id` is an optional external reference
    (payment id, signup event) appended to the ledger reason.
    """
    profile = await db.get(Profile, user_id, with_for_update=True)
    if profile is None:
        # Provision the profile first (it owns NOT NULL columns like
        # avatar_color), then re-read it under the lock.
        from services.user_service import get_or_create_profile

        await get_or_create_profile(db, user_id=user_id, email=None)
        profile = await db.get(Profile, user_id, with_for_update=True)

    new_balance = profile.credits_balance + credits
    profile.credits_balance = new_balance
    db.add(
        CreditLedger(
            user_id=user_id,
            delta=credits,
            balance_after=new_balance,
            reason=f"{reason}:{ref_id}" if ref_id else reason,
        )
    )
    return new_balance


async def deduct_credits(
    db: AsyncSession,
    user_id: uuid.UUID,
    credits: int,
    reason: str,
    *,
    ref_id: str | None = None,
) -> int:
    """Deduct `credits` under a row lock; returns the new balance.

    Raises `InsufficientCredits` when the balance would go negative. The caller
    owns the commit.
    """
    profile = await db.get(Profile, user_id, with_for_update=True)
    if profile is None or profile.credits_balance < credits:
        raise InsufficientCredits(
            user_id=user_id,
            required=credits,
            balance=profile.credits_balance if profile is not None else 0,
        )

    new_balance = profile.credits_balance - credits
    profile.credits_balance = new_balance
    db.add(
        CreditLedger(
            user_id=user_id,
            delta=-credits,
            balance_after=new_balance,
            reason=f"{reason}:{ref_id}" if ref_id else reason,
        )
    )
    return new_balance
