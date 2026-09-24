"""Scheduled tasks: a future event the system promised to make happen.

This table is the Scheduler's only state, and it is deliberately a *promise*, not
a job: `runAt` (when), `type` + `payload` (what), `status` (whether it still
has to happen). Nothing here knows why the task exists — no reason, no learning
objective, no priority, no recurrence. Those are decisions made by whoever called
`schedule()`, and re-deriving them here would make this table a second brain.

Why a table and not a timer: a `setTimeout` dies with the page, and a task the
learner set for tomorrow must survive their laptop closing AND the API process
restarting. Persisting first and waiting second is the whole reason the Scheduler
can be simple — the clock is the only volatile part, and it is re-derivable.

Status is a closed set of four, and the transitions are the design:

    pending ──claim──► executed          (the notification was delivered)
        │  └──claim──► failed            (claimed, delivery raised — never retried)
        └──cancel────► cancelled         (the learner changed their mind)

`executed`/`failed` are terminal: the claim sets them BEFORE the side effect is
attempted, which is what makes "the same task never fires twice" true rather than
hopeful (see `services/scheduler_service.trigger`). The cost of that choice is
recorded honestly: a crash between the claim and the delivery loses one
notification instead of duplicating it, and V1 would need an outbox to get both.

`payload` is JSONB on purpose: V0 has one task type (`notification`) whose payload
is `{title, body}`, and the next one (email, push, a Global Agent action) must not
need a migration to be stored.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base

# The four states above, named once. Kept as plain strings (not a PG enum) for
# the same reason `notifications.type` is a string: adding one should not be a
# migration.
STATUS_PENDING = "pending"
STATUS_EXECUTED = "executed"
STATUS_FAILED = "failed"
STATUS_CANCELLED = "cancelled"
TASK_STATUSES = (STATUS_PENDING, STATUS_EXECUTED, STATUS_FAILED, STATUS_CANCELLED)


class ScheduledTask(Base):
    """One promise: at `run_at`, do `type` with `payload`."""

    __tablename__ = "scheduled_tasks"
    __table_args__ = (
        # The runner's only query: pending tasks whose time has come, oldest first.
        # Leading on `status` keeps that scan tiny even with a long history of
        # executed rows sitting in the same table.
        Index("ix_scheduled_tasks_status_run_at", "status", "run_at"),
        # The Calendar's read: this user's tasks, in time order.
        Index("ix_scheduled_tasks_user_run_at", "user_id", "run_at"),
        CheckConstraint(
            "length(btrim(type)) > 0", name="ck_scheduled_tasks_type_not_blank"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Same IDOR discipline as notifications/space_memories: the owner rides on the
    # row, so "only mine" needs no join.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    # WHEN. Timezone-aware, always: a naive timestamp is a guess about the
    # reader's clock, and this column decides whether something already happened.
    run_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False
    )
    type: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )
    status: Mapped[str] = mapped_column(
        String, nullable=False, default=STATUS_PENDING, server_default=STATUS_PENDING
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    # WHEN IT ACTUALLY HAPPENED — nil until the claim. Distinct from `run_at`
    # because "was due at 19:00" and "fired at 19:00:04" are different facts, and
    # the calendar only ever shows the first.
    executed_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    # Why it failed, if it failed. A delivery error that is only logged is a
    # promise nobody can audit; V0 never retries, so this column is the record.
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
