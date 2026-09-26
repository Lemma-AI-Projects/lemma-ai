from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user
from schemas.user import UserMe, UserMeUpdateIn
from services.user_service import get_or_create_profile, update_profile

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMe)
async def read_current_user(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserMe:
    profile = await get_or_create_profile(
        db, user_id=current_user.id, email=current_user.email
    )
    return UserMe.model_validate(profile)


@router.patch("/me", response_model=UserMe)
async def update_current_user(
    payload: UserMeUpdateIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserMe:
    """Update the caller's own identity fields (nickname only, for now).

    Home shows the nickname in About Me but does not own it — the write path
    stays here, on the table that has always owned it.
    """
    profile = await update_profile(
        db,
        user_id=current_user.id,
        nickname=payload.nickname,
        nickname_set="nickname" in payload.model_fields_set,
    )
    return UserMe.model_validate(profile)
