"""Coordinator REST surface: what the decision layer decided, and what it would.

Read-only, on purpose, and this is the boundary worth stating plainly:

  - `GET /coordinator/decisions` → the log, newest first (the audit panel).
  - `GET /coordinator/explain`   → a DRY RUN: the snapshot and the decision the
    rules produce right now, with no executor and no log row. It exists because
    a decision layer nobody can inspect is a black box even when the rules inside
    it are twenty lines.

There is no endpoint that makes the Coordinator *do* something. It is invoked
in-process by the two places evidence is written (the chat tool and
`POST /knowledge/evidence`), which is the minimum mechanism the brief asks for
and the one that cannot be called with an event that never happened. Adding a
public "announce an event" route would also create a second way to write
evidence-adjacent state, which is exactly what `api/v1/knowledge.py` promises
does not exist.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user
from ai.coordinator import EVENT_SOURCES
from schemas.coordinator import CoordinatorDecisionOut, ExplanationOut
from services import coordinator_service, project_service

router = APIRouter(prefix="/coordinator", tags=["coordinator"])

_LIST_LIMIT_MAX = 100

_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="project_not_found"
)


async def _require_owned_project(
    db: AsyncSession, user: CurrentUser, project_id: uuid.UUID
) -> None:
    """Same IDOR rule as /knowledge and /pages: foreign or unknown is 404."""
    project = await project_service.get_owned_project(
        db, user_id=user.id, project_id=project_id
    )
    if project is None:
        raise _NOT_FOUND


@router.get("/decisions", response_model=list[CoordinatorDecisionOut])
async def list_decisions(
    project_id: uuid.UUID | None = Query(default=None, alias="projectId"),
    limit: int = Query(default=coordinator_service.DEFAULT_LIST_LIMIT, ge=1, le=_LIST_LIMIT_MAX),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CoordinatorDecisionOut]:
    """The caller's decisions, newest first. `?projectId=` narrows to one space."""
    if project_id is not None:
        await _require_owned_project(db, current_user, project_id)
    records = await coordinator_service.list_for_user(
        db, user_id=current_user.id, project_id=project_id, limit=limit
    )
    return [CoordinatorDecisionOut.model_validate(record) for record in records]


@router.get("/explain", response_model=ExplanationOut)
async def explain_decision(
    project_id: uuid.UUID = Query(alias="projectId"),
    item_id: uuid.UUID | None = Query(default=None, alias="itemId"),
    source: str = Query(default="api"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ExplanationOut:
    """Dry run: "if this event happened now, what would the Coordinator decide?".

    422 for a source outside the two the events carry — the delivery rule turns
    on it, so a typo there would silently change the answer.
    """
    if source not in EVENT_SOURCES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"unknown event source: {source}",
        )
    await _require_owned_project(db, current_user, project_id)
    explanation = await coordinator_service.explain(
        db,
        user_id=current_user.id,
        project_id=project_id,
        item_id=item_id,
        source=source,
    )
    return ExplanationOut.model_validate(explanation)
