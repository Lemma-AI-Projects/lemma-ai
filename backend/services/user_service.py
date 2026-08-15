import random
import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models.payment import CreditLedger
from models.profile import Profile

# A small palette so each new user gets a distinct, stable avatar color.
AVATAR_PALETTE = (
    "#FF8F50",
    "#A855F7",
    "#0EA5E9",
    "#22C55E",
    "#F43F5E",
    "#EAB308",
    "#6366F1",
    "#14B8A6",
)

# Free credits granted on first login (拍板 2026-08-14). Enough for a real
# first experience of the AI features; the balance is metered against actual
# AI cost (1 credit = $0.01) and hard-blocks at zero.
SIGNUP_BONUS_CREDITS = 500


async def get_or_create_profile(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    email: str | None,
) -> Profile:
    """Return the caller's profile, creating it on first login.

    Supabase Auth owns identity, so the profile is provisioned lazily the first
    time an authenticated user reaches the backend. Email is treated as
    Supabase-owned and refreshed from the verified token on every call.
    """
    profile = await db.get(Profile, user_id)
    if profile is not None:
        if email and profile.email != email:
            profile.email = email
            await db.commit()
            await db.refresh(profile)
        return profile

    profile = Profile(
        id=user_id,
        email=email or "",
        nickname=None,
        subscription_plan="free",
        avatar_color=random.choice(AVATAR_PALETTE),
        credits_balance=SIGNUP_BONUS_CREDITS,
    )
    db.add(profile)
    db.add(
        CreditLedger(
            user_id=user_id,
            delta=SIGNUP_BONUS_CREDITS,
            balance_after=SIGNUP_BONUS_CREDITS,
            reason="signup_bonus",
        )
    )
    try:
        await db.commit()
    except IntegrityError:
        # A concurrent first request already created it; fall back to that row.
        await db.rollback()
        existing = await db.get(Profile, user_id)
        if existing is None:
            raise
        return existing

    await db.refresh(profile)
    return profile
