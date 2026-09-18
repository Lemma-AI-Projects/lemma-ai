from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user
from schemas.progress import CompletionsOut, CompletionsQuery
from services import progress_service

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/completions", response_model=CompletionsOut)
async def list_completions(
    window: Annotated[CompletionsQuery, Query()],
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CompletionsOut:
    # The client computes the window in ITS timezone and buckets the instants
    # per local day — the server never guesses what "today" means for a learner.
    # Window sanity (ordering, span) is enforced by CompletionsQuery.
    completions = await progress_service.list_completions_between(
        db, user_id=current_user.id, start=window.start, end=window.end
    )
    return CompletionsOut(completed_at=completions)
