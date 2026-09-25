"""Question sets: list, read (answer view), submit (server grading).

Error codes (detail): 404 not_found (not yours == not there), 409
content_version_mismatch / already_submitted, 422 invalid_submission.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user
from schemas.question import AttemptResult, QuestionSetSummary, QuestionSetView, SubmissionsIn
from services import question_attempt_service, question_set_service
from services.question_set_service import QuestionSetError

router = APIRouter(prefix="/question-sets", tags=["question-sets"])


def _http(error: QuestionSetError) -> HTTPException:
    return HTTPException(status_code=error.status_code, detail=error.code)


@router.get("", response_model=list[QuestionSetSummary])
async def list_question_sets(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[QuestionSetSummary]:
    return await question_set_service.list_sets(db, user_id=current_user.id, limit=limit, offset=offset)


@router.get("/{set_id}", response_model=QuestionSetView)
async def get_question_set(
    set_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuestionSetView:
    question_set = await question_set_service.get_owned_set(db, user_id=current_user.id, set_id=set_id)
    if question_set is None:
        raise _http(question_set_service.not_found())
    views = await question_set_service.load_views(db, set_id=set_id)
    open_attempt = await question_attempt_service.open_attempt(
        db, user_id=current_user.id, set_id=set_id
    )
    return question_set_service.build_view(question_set, views, open_attempt)


@router.post("/{set_id}/submissions", response_model=list[AttemptResult])
async def submit_attempts(
    set_id: uuid.UUID,
    payload: SubmissionsIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AttemptResult]:
    try:
        return await question_attempt_service.submit(
            db, user_id=current_user.id, set_id=set_id, submissions=payload.submissions
        )
    except QuestionSetError as error:
        raise _http(error) from error
