"""Types shared by the schedule book, the rules layer and the sources.

Days are dates (the smallest unit is a day; "today" is computed by the caller
in the user's timezone and passed in).
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Literal, Protocol

from pydantic import BaseModel, ConfigDict

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

OverduePolicy = Literal["replan_by_source"]  # 交给来源重排 (the only one this version)
TaskStatus = Literal["done", "overdue", "todo"]  # 完成 / 过期 / 待办


class SourceRef(BaseModel):
    """来源: who placed a task. `kind` is registered with the rules layer
    (e.g. "course"); `id` is the source's own id, opaque to the schedule."""

    model_config = ConfigDict(frozen=True)

    kind: str
    id: str


class NewTask(BaseModel):
    """One task handed to 放入. `item_ref` (事项) is the source's own handle,
    e.g. a lesson id; the schedule stores it and never interprets it."""

    item_ref: str
    title: str
    weight: int
    sequence: int | None
    planned_date: date
    overdue_policy: OverduePolicy = "replan_by_source"


class TaskMove(BaseModel):
    """One entry of 改期."""

    item_ref: str
    planned_date: date


class OrderKey(BaseModel):
    """What the "order never inverts" check looks at for one unfinished task."""

    item_ref: str
    sequence: int | None
    planned_date: date


class Task(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    source: SourceRef
    item_ref: str
    title: str
    weight: int
    sequence: int | None
    planned_date: date
    original_planned_date: date
    overdue_policy: OverduePolicy
    progress: float
    completed_at: datetime | None
    created_at: datetime  # 放入于


class TaskView(Task):
    """A task as the queries return it, with its derived status."""

    status: TaskStatus


class DayLoad(BaseModel):
    """负荷 of one day: unfinished weight, weight × (1 − progress) summed."""

    day: date
    load: float


class ItemProgress(BaseModel):
    """One entry of a source's 核对进度 answer."""

    item_ref: str
    progress: float


class SourceHandler(Protocol):
    """The two entries a source registers with the rules layer (来源登记).

    Both receive the rules layer's own session and run inside its transaction
    scope and schedule lock: use only `db`, never open another session, and
    never commit. A source may call the public queries (load_by_day,
    list_tasks); inside overdue processing they read directly without
    triggering it again.
    """

    async def reconcile_progress(
        self, db: AsyncSession, *, user_id: uuid.UUID, source_id: str
    ) -> list[ItemProgress]:
        """核对进度: the source's own truth for each of its items."""
        ...

    async def replan(
        self, db: AsyncSession, *, user_id: uuid.UUID, source_id: str, today: date
    ) -> None:
        """重排: compute new dates from `today` on and apply them with 改期."""
        ...
