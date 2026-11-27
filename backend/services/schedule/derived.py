"""Values the rules layer derives on read (日程本里没有算出来的东西). Pure."""

from collections.abc import Sequence
from datetime import date, datetime

from services.schedule.types import DayLoad, SourceRef, Task, TaskStatus


def task_status(planned_date: date, completed_at: datetime | None, *, today: date) -> TaskStatus:
    """完成 when completed_at is set; 过期 when planned before today and not
    done; otherwise 待办."""
    raise NotImplementedError


def daily_load(
    tasks: Sequence[Task],
    *,
    start: date,
    end: date,
    exclude_source: SourceRef | None = None,
) -> list[DayLoad]:
    """负荷 for every day from start to end inclusive: the unfinished weight
    of that day's tasks, each counted weight × (1 − progress), leaving out
    `exclude_source`."""
    raise NotImplementedError


def overdue_sources(tasks: Sequence[Task], *, today: date) -> list[SourceRef]:
    """Sources with at least one overdue task, in the order they first placed
    tasks (the earliest created_at among their tasks still on record).

    Pass all of the user's tasks for the sources concerned, finished ones
    included, so the first-placement order is as complete as the rows allow.
    """
    raise NotImplementedError
