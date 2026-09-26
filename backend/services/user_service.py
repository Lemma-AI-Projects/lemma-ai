import random
import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

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
    )
    db.add(profile)
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


async def update_profile(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    nickname: str | None = None,
    nickname_set: bool = False,
) -> Profile:
    """Write the fields a user owns about their own identity.

    `nickname_set` (rather than `nickname is not None`) is what lets the API
    distinguish "leave it alone" from "clear it" — clearing a nickname is a real
    request, and `None` alone cannot express both.

    The row is provisioned on demand, so a PATCH that arrives before the user's
    first GET still lands on a profile.
    """
    profile = await get_or_create_profile(db, user_id=user_id, email=None)
    if nickname_set:
        cleaned = (nickname or "").strip()
        profile.nickname = cleaned or None
        await db.commit()
        await db.refresh(profile)
    return profile
