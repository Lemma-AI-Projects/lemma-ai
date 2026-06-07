from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user
from schemas.user import UserMe
from services.user_service import get_or_create_profile

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
