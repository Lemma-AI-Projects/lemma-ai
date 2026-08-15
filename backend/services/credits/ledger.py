"""Credit ledger operations: grant, deduct, and query balance.

Pricing rule (拍板 2026-08-14): 1 credit = $0.01 USD of AI cost.
Conversions are always rounded UP so the platform never loses money on
fractional-cent costs.
"""

import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from models.payment import CreditLedger
from models.profile import Profile


def usd_to_credits(cost_usd: Decimal | None) -> int:
    """Convert USD cost to whole credits (1 credit = $0.01, ceil).

    Returns 0 when cost is None or zero — those are tracking-only rows
    (failed attempts, free tiers) that must not trigger a deduction.
    """
    if cost_usd is None or cost_usd <= 0:
        return 0
    # cost_usd * 100 → credits (e.g. $0.013 → 2 credits)
    credits = int((cost_usd * 100).to_integral_value(rounding="ROUND_CEILING"))
    return max(credits, 1)


async def get_balance(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Return the current credits balance for a user.

    Returns 0 when the profile doesn't exist yet (edge case: a user who
    has never triggered profile creation and somehow reaches an AI endpoint).
    """
    profile = await db.get(Profile, user_id)
    return profile.credits_balance if profile is not None else 0


async def require_credits(
    db: AsyncSession, user_id: uuid.UUID, *, min_credits: int = 1
) -> int:
    """Return the current balance, raising `InsufficientCredits` when below
    `min_credits`. The API layer maps that to a 402 for the frontend."""
    balance = await get_balance(db, user_id)
    if balance < min_credits:
        raise InsufficientCredits(
            user_id=user_id, required=min_credits, balance=balance
        )
    return balance


async def grant_credits(
    db: AsyncSession,
    user_id: uuid.UUID,
    credits: int,
    reason: str,
    *,
    ref_id: str | None = None,
) -> int:
    """Add `credits` to the user's balance under a row lock; returns new balance.

    Creates the profile if it doesn't exist yet. The caller owns the commit.
    `ref_id` is an optional external reference (e.g. payment id, signup event)
    stored in the CreditLedger.reason suffix.
    """
    profile = await db.get(Profile, user_id, with_for_update=True)
    if profile is None:
        profile = Profile(
            id=user_id,
            email="",
            nickname=None,
            subscription_plan="free",
            credits_balance=0,
        )
        db.add(profile)
        await db.flush()

    new_balance = profile.credits_balance + credits
    profile.credits_balance = new_balance
    reason_str = f"{reason}:{ref_id}" if ref_id else reason
    db.add(
        CreditLedger(
            user_id=user_id,
            delta=credits,
            balance_after=new_balance,
            reason=reason_str,
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
    """Deduct `credits` from the user's balance under a row lock; returns new balance.

    Raises `InsufficientCredits` when the balance would go negative.
    The caller owns the commit.
    """
    profile = await db.get(Profile, user_id, with_for_update=True)
    if profile is None:
        raise InsufficientCredits(
            user_id=user_id,
            required=credits,
            balance=0,
        )
    if profile.credits_balance < credits:
        raise InsufficientCredits(
            user_id=user_id,
            required=credits,
            balance=profile.credits_balance,
        )

    new_balance = profile.credits_balance - credits
    profile.credits_balance = new_balance
    reason_str = f"{reason}:{ref_id}" if ref_id else reason
    db.add(
        CreditLedger(
            user_id=user_id,
            delta=-credits,
            balance_after=new_balance,
            reason=reason_str,
        )
    )
    return new_balance


class InsufficientCredits(Exception):
    """Raised when a user doesn't have enough credits for an operation."""

    def __init__(
        self,
        *,
        user_id: uuid.UUID,
        required: int,
        balance: int,
    ) -> None:
        self.user_id = user_id
        self.required = required
        self.balance = balance
        super().__init__(
            f"user {user_id} needs {required} credits but has {balance}"
        )