"""Rules layer (规则层): overdue processing, the three queries, comfort load.

Doesn't know which course a task belongs to; reaches sources only through
the registry.

Every query starts with _ensure_overdue_processed:
1. this session carries the "processing overdue for this user" mark
   (db.info[_OVERDUE_MARK_KEY] == user_id): return — we are inside a source's
   replan, reading in the same transaction what has already been reconciled
   and moved;
2. the processing record says today: return, without lock or write;
3. open a transaction scope and take the user's schedule lock;
4. read the record again (fresh, by column): today -> return (another
   request just finished);
5. set the mark and process overdue (_process_overdue); clear the mark
   afterwards whether it succeeded or not;
6. every source succeeded -> record = today, in the same transaction as the
   task changes, so step 2 seeing "today" implies the changes are visible.

So a source's replan can call the public queries without recursing, and
neither the query signatures nor SourceHandler need a special flag.
"""

import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from services.schedule.types import DayLoad, SourceRef, TaskView

_OVERDUE_MARK_KEY = "lemma_schedule_overdue_user"


def comfort_load() -> float:
    """舒适量 (services/product_params.py, SCHEDULE section)."""
    raise NotImplementedError


async def _ensure_overdue_processed(
    db: AsyncSession, *, user_id: uuid.UUID, today: date
) -> None:
    """Steps 1-6 in the module docstring."""
    raise NotImplementedError


async def _process_overdue(db: AsyncSession, *, user_id: uuid.UUID, today: date) -> bool:
    """处理过期, inside the caller's scope and schedule lock.

    1. For every source with unfinished tasks: apply its reconcile_progress
       answer with record_progress.
    2. For every source with overdue tasks, in first-placement order: its
       replan(today), each inside its own savepoint; a failure (including an
       unregistered kind) rolls back only that source and moves on.
    Returns True when every source succeeded.
    """
    raise NotImplementedError


async def today_list(db: AsyncSession, *, user_id: uuid.UUID, today: date) -> list[TaskView]:
    """今天的清单: tasks planned for today, each with its status."""
    raise NotImplementedError


async def list_tasks(
    db: AsyncSession, *, user_id: uuid.UUID, start: date, end: date, today: date
) -> list[TaskView]:
    """查任务: tasks planned from start to end inclusive, each with its status."""
    raise NotImplementedError


async def load_by_day(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    start: date,
    end: date | None,
    today: date,
    exclude_source: SourceRef | None = None,
) -> list[DayLoad]:
    """查负荷: one entry per day from start to end inclusive. end None = up to
    the last day that has a task (empty list when there is none).
    exclude_source leaves one source out, e.g. the course being replanned."""
    raise NotImplementedError


async def _last_processed_on(db: AsyncSession, *, user_id: uuid.UUID) -> date | None:
    """ScheduleOverdueRecord.last_processed_on, selected by column so a value
    the session already holds is never reused after taking the lock."""
    raise NotImplementedError


async def _record_processed(db: AsyncSession, *, user_id: uuid.UUID, today: date) -> None:
    """Upsert the ScheduleOverdueRecord row for the user with today."""
    raise NotImplementedError
