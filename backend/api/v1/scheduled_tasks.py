"""Scheduler REST endpoints: make a promise, look at the plan, take it back.

Four surfaces, all scoped to the caller's own tasks:

  - `POST   /scheduled-tasks`         → `schedule()`: "at this time, do this"
  - `GET    /scheduled-tasks`         → `list()`: the plan, in time order
  - `POST   /scheduled-tasks/{id}/cancel` → `cancel()`
  - `POST   /scheduled-tasks/{id}/run`    → `trigger()`: fire it now

`/run` is the odd one out and it is deliberate: `trigger()` is part of the
Scheduler's interface (it is what the clock calls when a task comes due), and
exposing it makes the whole chain — Scheduler → Notification Sender → Feed —
testable in one second instead of in thirty. It is not a "run my task early"
product feature; it runs the same code path the clock would, and the atomic
claim makes it harmless if the clock gets there first.

Ownership is never a parameter: the user comes from the token, so nobody can
schedule work for, read, cancel or fire somebody else's tasks.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user
from models.scheduled_task import TASK_STATUSES
from schemas.scheduled_task import TaskIn, TaskOut
from services import scheduler_service
from services.scheduler_service import InvalidTask, NotCancellable

router = APIRouter(prefix="/scheduled-tasks", tags=["scheduler"])

# A page a person scrolls, not an archive. The Calendar only ever needs the
# window it is looking at.
_LIST_LIMIT_MAX = 200


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TaskOut:
    """Schedule one task for the caller.

    422 for a task that could never be kept (unknown type, no title in a
    notification payload, a timestamp with no offset): the caller has to see it
    now, not discover it when the task silently does nothing.
    """
    try:
        task = await scheduler_service.schedule(
            db,
            user_id=current_user.id,
            task=scheduler_service.TaskInput(
                run_at=payload.run_at,
                type=payload.type,
                payload=payload.payload,
            ),
        )
    except InvalidTask as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    return TaskOut.model_validate(task)


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=_LIST_LIMIT_MAX, ge=1, le=_LIST_LIMIT_MAX),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TaskOut]:
    """The caller's tasks, in time order. `?status=pending` is the Calendar's
    "what is still coming" query; no filter means "the whole plan"."""
    if status_filter is not None and status_filter not in TASK_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"unknown status: {status_filter}",
        )
    tasks = await scheduler_service.list_for_user(
        db, user_id=current_user.id, status=status_filter, limit=limit
    )
    return [TaskOut.model_validate(task) for task in tasks]


@router.post("/{task_id}/cancel", response_model=TaskOut)
async def cancel_task(
    task_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TaskOut:
    """Cancel a pending task. 404 if it is not the caller's; 409 if it already
    happened (a race the learner can lose, and saying so beats pretending)."""
    try:
        task = await scheduler_service.cancel(
            db, user_id=current_user.id, task_id=task_id
        )
    except NotCancellable as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="task_not_found"
        )
    return TaskOut.model_validate(task)


@router.post("/{task_id}/run", response_model=TaskOut)
async def run_task(
    task_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TaskOut:
    """Fire a task now — the same path the clock takes when it comes due.

    409 if it is no longer pending: that covers both "already fired" and the
    genuinely racy case where the clock beat this request to it (in which case
    the reminder went out exactly once, which is the point).
    """
    entity = await scheduler_service.get_for_user(
        db, user_id=current_user.id, task_id=task_id
    )
    if entity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="task_not_found"
        )
    fired = await scheduler_service.trigger(db, task=entity)
    if fired is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="task_not_pending"
        )
    return TaskOut.model_validate(fired)
