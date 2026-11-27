"""The schedule book (日程本): stores tasks. Only these four actions change it.

Knows nothing about courses, AI or the rules layer (it never imports rules,
sources or derived). Every action:
- runs inside `transaction(db)`; all or nothing;
- takes the user's schedule lock first (同一个用户的日程写入一个一个来);
- carries the source and only touches tasks that source placed (invariant 3).

Completed tasks are never moved, withdrawn or rolled back (invariant 2).
"""

import uuid
from collections.abc import Sequence
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from models.schedule_task import ScheduleTask
from services.schedule.types import NewTask, SourceRef, Task, TaskMove


async def lock_user_schedule(db: AsyncSession, *, user_id: uuid.UUID) -> None:
    """Take the user's schedule lock for the rest of the current transaction
    (lock_in_transaction with key "schedule:{user_id}"). Must be inside a
    transaction scope. Raises ScheduleError(schedule_busy) on timeout.

    Lock order: a course row lock, if any, is taken before this one; while
    holding this lock, never write to or lock rows of the course library.
    """
    raise NotImplementedError


async def place_tasks(
    db: AsyncSession, *, user_id: uuid.UUID, source: SourceRef, tasks: Sequence[NewTask]
) -> None:
    """放入: items this source already has a task for are skipped (existing
    tasks untouched). If the source's unfinished tasks would then be out of
    order, the whole batch is refused (task_order_violation). Each new row
    gets original_planned_date = planned_date, progress 0."""
    raise NotImplementedError


async def move_tasks(
    db: AsyncSession, *, user_id: uuid.UUID, source: SourceRef, moves: Sequence[TaskMove]
) -> None:
    """改期: every item must be an unfinished task of this source
    (task_not_found / task_completed) and the result must keep order
    (task_order_violation); otherwise the whole batch is refused. Only
    planned_date changes."""
    raise NotImplementedError


async def withdraw_tasks(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    source: SourceRef,
    item_refs: Sequence[str] | None = None,
) -> None:
    """撤走: delete the named tasks, or all unfinished ones when item_refs is
    None. A named item that is completed refuses the batch (task_completed);
    a named item that does not exist counts as already withdrawn."""
    raise NotImplementedError


async def record_progress(
    db: AsyncSession, *, user_id: uuid.UUID, source: SourceRef, item_ref: str, progress: float
) -> None:
    """记进度: progress outside 0..1 is invalid_progress. No such task: do
    nothing. Completed, or not larger than the stored value: unchanged.
    Otherwise store it; at 1 set completed_at = now."""
    raise NotImplementedError


async def list_source_tasks(
    db: AsyncSession, *, user_id: uuid.UUID, source: SourceRef
) -> list[Task]:
    """按来源读: every task of this source (finished or not), by sequence.
    For sources (schedulers) only; date-range reads go through the rules
    layer."""
    raise NotImplementedError


async def list_tasks_in_range(
    db: AsyncSession, *, user_id: uuid.UUID, start: date, end: date | None
) -> list[Task]:
    """按用户和日子的范围读 (end None = no upper bound). Used inside the
    package by the rules layer; not part of the public entry."""
    raise NotImplementedError


async def list_unfinished_tasks(db: AsyncSession, *, user_id: uuid.UUID) -> list[Task]:
    """All of the user's unfinished tasks, for overdue processing. Used inside
    the package by the rules layer; not part of the public entry."""
    raise NotImplementedError


def _to_task(row: ScheduleTask) -> Task:
    """Row -> boundary type; rows never leave this module."""
    raise NotImplementedError
