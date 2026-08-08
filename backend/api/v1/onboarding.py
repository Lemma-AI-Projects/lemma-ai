"""New-user onboarding endpoints (v0.3 capacity-first flow).

- GET  /onboarding/status  → has_completed_onboarding (+ interests)
- POST /onboarding/complete → save the capacity screen's free-form answer and
  flip the gate so the app unlocks.

The flow itself is frontend-driven; the backend only stores the state and the
free-form interests that seed the first learn space / agent generation.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user
from services.user_service import get_or_create_profile

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


class OnboardingStatusOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    has_completed_onboarding: bool
    onboarding_interests: str | None


class OnboardingCompleteIn(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    # 容量首屏的自由表达：什么都不学/暂时没想好也允许空。存储的是原话，
    # 后续空间名与老师档案生成时作为种子输入。
    interests: str | None = None


@router.get("/status", response_model=OnboardingStatusOut)
async def get_onboarding_status(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OnboardingStatusOut:
    profile = await get_or_create_profile(
        db, user_id=current_user.id, email=current_user.email
    )
    return OnboardingStatusOut(
        has_completed_onboarding=profile.has_completed_onboarding,
        onboarding_interests=profile.onboarding_interests,
    )


@router.post("/complete", response_model=OnboardingStatusOut)
async def complete_onboarding(
    payload: OnboardingCompleteIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OnboardingStatusOut:
    profile = await get_or_create_profile(
        db, user_id=current_user.id, email=current_user.email
    )
    profile.onboarding_interests = payload.interests or None
    profile.has_completed_onboarding = True
    await db.commit()
    await db.refresh(profile)
    return OnboardingStatusOut(
        has_completed_onboarding=profile.has_completed_onboarding,
        onboarding_interests=profile.onboarding_interests,
    )
