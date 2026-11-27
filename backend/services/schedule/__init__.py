"""Schedule system (日程系统): stores tasks (which day has what), handles
tasks whose day has passed, and answers three queries. It does not know
courses: tasks point back to their source with opaque strings.

Two layers inside:
- schedule book (日程本: ledger.py, ordering.py) — the four actions;
- rules layer (rules.py, sources.py, derived.py) — overdue processing, the
  three queries, the source registry and the comfort load. The schedule book
  never imports the rules layer.

This module is the only public entry. Code outside the package imports from
here and never touches models/schedule_*.py directly. Reads by date range go
through the rules layer's queries; reading by source is for schedulers.

`today` is always passed in, computed by the caller in the user's timezone
when the request (or Celery task) runs. Nothing in here reads the clock to
decide what day it is.
"""

from services.schedule.errors import (
    INVALID_PROGRESS,
    SCHEDULE_BUSY,
    SOURCE_NOT_REGISTERED,
    TASK_COMPLETED,
    TASK_NOT_FOUND,
    TASK_ORDER_VIOLATION,
    ScheduleError,
)
from services.schedule.ledger import (
    list_source_tasks,
    lock_user_schedule,
    move_tasks,
    place_tasks,
    record_progress,
    withdraw_tasks,
)
from services.schedule.rules import comfort_load, list_tasks, load_by_day, today_list
from services.schedule.sources import register_source
from services.schedule.types import (
    DayLoad,
    ItemProgress,
    NewTask,
    OverduePolicy,
    SourceHandler,
    SourceRef,
    Task,
    TaskMove,
    TaskStatus,
    TaskView,
)

__all__ = [
    "INVALID_PROGRESS",
    "SCHEDULE_BUSY",
    "SOURCE_NOT_REGISTERED",
    "TASK_COMPLETED",
    "TASK_NOT_FOUND",
    "TASK_ORDER_VIOLATION",
    "DayLoad",
    "ItemProgress",
    "NewTask",
    "OverduePolicy",
    "ScheduleError",
    "SourceHandler",
    "SourceRef",
    "Task",
    "TaskMove",
    "TaskStatus",
    "TaskView",
    "comfort_load",
    "list_source_tasks",
    "list_tasks",
    "load_by_day",
    "lock_user_schedule",
    "move_tasks",
    "place_tasks",
    "record_progress",
    "register_source",
    "today_list",
    "withdraw_tasks",
]
