"""API contract for the Scheduler. Wire format is camelCase.

The task's shape is the one the caller stores, not a view of it:

  - `TaskIn`  — `runAt` (ISO 8601 with an offset, required), `type` (default
    `notification`) and `payload` (free-form, validated per type by the
    Scheduler). Times are parsed by pydantic into timezone-aware datetimes; a
    string without an offset is a 422 rather than a guess about the caller's
    clock.
  - `TaskOut` — the task plus the facts about whether it happened: `status`,
    `createdAt`, `executedAt`, `error`.

`type` is a plain `str` for the same reason notification `type` is: the valid
set lives in one place (`services/scheduler_service.TASK_TYPES`) so adding a
handler is one edit, not a schema change.
"""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from services.scheduler_service import TYPE_NOTIFICATION


class TaskIn(BaseModel):
    """One promise to make."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    # Required and offset-aware: the whole feature is "has this moment passed?".
    run_at: datetime
    type: str = TYPE_NOTIFICATION
    payload: dict[str, Any] = Field(default_factory=dict)


class TaskOut(BaseModel):
    """A task as the Calendar and the API see it."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    run_at: datetime
    type: str
    payload: dict[str, Any]
    status: str
    created_at: datetime
    executed_at: datetime | None
    error: str | None


__all__ = ["TaskIn", "TaskOut"]
