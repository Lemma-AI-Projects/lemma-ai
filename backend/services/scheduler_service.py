"""Scheduler: makes a future event happen at its time.

The whole job is one question — *"is this task due?"* — and everything else here
is bookkeeping around the answer:

    schedule()  a promise: at run_at, do `type` with `payload`
    cancel()    take the promise back (only while it is still pending)
    list()      the promises, in time order — what the Calendar shows
    trigger()   the moment of truth: claim it, then hand it to a handler
    run_due()   the loop's body: trigger every pending task whose time has come
    run_forever() the clock: a poll loop, restarted with the process

What it deliberately does NOT know:

  * **What a good moment is.** No spaced repetition, no learning analysis, no
    priority, no "when should she study". `run_at` arrives from the caller.
  * **What to say.** The notification's title and body come from `payload`; the
    Scheduler passes them to the sender untouched. A Scheduler that composed
    copy would be the Coordinator, wearing a clock.
  * **How to deliver.** It calls `notification_service.send()` and stops there:
    no Feed writes, no browser API, no notification row. The one allowed
    dependency edge is Scheduler → Notification Sender
    (`tests/services/test_scheduler.py` fails if a second one appears).

The clock is the only volatile part, and that is the point: the tasks live in
Postgres, so a restart loses nothing — the loop comes back up, asks the same
question, and the promises that came due meanwhile fire on the first tick.

Delivery is **at most once**: the claim (pending -> executed) is committed
BEFORE the handler runs, so a task can never fire twice, but a crash in the gap
between the claim and the delivery loses that one notification. That is the
deliberate side of the trade — V0 is built to never duplicate a reminder, and
getting both guarantees needs an outbox that V0 does not have (see §"没有做的"
in the model docstring).
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal
from models.scheduled_task import (
    STATUS_CANCELLED,
    STATUS_EXECUTED,
    STATUS_FAILED,
    STATUS_PENDING,
    ScheduledTask,
)
from services import notification_service
from services.notification_service import NotificationInput

logger = logging.getLogger(__name__)

TYPE_NOTIFICATION = "notification"
TASK_TYPES = (TYPE_NOTIFICATION,)

# One tick fires at most this many tasks, so a backlog after a long downtime is
# worked through in bounded chunks instead of one unbounded burst.
DUE_BATCH = 50

# A delivery error message is a diagnostic, not an essay.
ERROR_MAX_CHARS = 500


class InvalidTask(ValueError):
    """A task the Scheduler refuses to accept.

    Raised at `schedule()` time, never later: a promise that can never be kept
    (unknown type, a payload with no title, a naive timestamp) is a caller bug,
    and it must surface while the caller is still there to fix it — not as a
    silent no-op at 3am.
    """


class NotCancellable(ValueError):
    """The task exists and is the caller's, but it is no longer pending.

    Cancelling something already executed is a race the learner can lose (they
    tap cancel as the reminder fires); saying so is better than either pretending
    it worked or 404-ing a row they can plainly see.
    """

    def __init__(self, status: str) -> None:
        super().__init__(f"task is {status}, not pending")
        self.status = status


@dataclass(frozen=True)
class TaskInput:
    """What a caller hands to `schedule()`."""

    run_at: datetime
    type: str = TYPE_NOTIFICATION
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ScheduledTaskView:
    """A task as the API and the Calendar see it."""

    id: uuid.UUID
    run_at: datetime
    type: str
    payload: dict[str, Any]
    status: str
    created_at: datetime
    executed_at: datetime | None
    error: str | None


# --- validation (pure, and before any session is touched) -------------------


def _validated_notification_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """The payload a notification task must carry — checked when it is created.

    The Scheduler does not write the copy, but it does insist that there IS some,
    and that it is the shape the sender takes. Keeping the check here (not in the
    sender) means a caller learns about a typo at schedule time instead of
    discovering an empty reminder tomorrow.
    """
    title = payload.get("title")
    if not isinstance(title, str) or not title.strip():
        raise InvalidTask("notification payload needs a non-empty 'title'")
    body = payload.get("body", "")
    if not isinstance(body, str):
        raise InvalidTask("notification payload 'body' must be a string")
    metadata = payload.get("metadata", {})
    if not isinstance(metadata, dict):
        raise InvalidTask("notification payload 'metadata' must be an object")
    return dict(payload)


_PAYLOAD_VALIDATORS: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
    TYPE_NOTIFICATION: _validated_notification_payload,
}


def validate(task: TaskInput) -> TaskInput:
    """Refuse a task that could never be kept. Returns it unchanged if it is fine."""
    if task.run_at is None or task.run_at.tzinfo is None:
        # A naive datetime is a guess about which clock the caller meant; the
        # whole feature turns on "has this moment passed?", so the guess is
        # refused rather than made. ISO 8601 with an offset, always.
        raise InvalidTask("run_at must be timezone-aware (ISO 8601 with an offset)")
    validator = _PAYLOAD_VALIDATORS.get(task.type)
    if validator is None:
        raise InvalidTask(f"unknown task type: {task.type}")
    validator(dict(task.payload or {}))
    return task


def is_due(task: ScheduledTask, *, now: datetime) -> bool:
    """The Scheduler's only decision, as a pure function of a row and a clock.

    A past `run_at` is not an error: it means "due now", which is how an overdue
    task survives a restart and fires on the first tick.
    """
    return task.status == STATUS_PENDING and task.run_at <= now


# --- the four operations ----------------------------------------------------


async def schedule(
    db: AsyncSession, *, user_id: uuid.UUID, task: TaskInput
) -> ScheduledTaskView:
    """Create the promise. Nothing runs until its time comes."""
    validate(task)
    row = ScheduledTask(
        user_id=user_id,
        run_at=task.run_at,
        type=task.type,
        payload=dict(task.payload or {}),
        status=STATUS_PENDING,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_view(row)


async def cancel(
    db: AsyncSession, *, user_id: uuid.UUID, task_id: uuid.UUID
) -> ScheduledTaskView | None:
    """Take a pending promise back.

    Returns None when there is no such task FOR THIS USER (the API turns that
    into a 404 without leaking existence), and raises `NotCancellable` when the
    task is theirs but already executed/failed/cancelled.
    """
    result = await db.execute(
        update(ScheduledTask)
        .where(
            ScheduledTask.id == task_id,
            ScheduledTask.user_id == user_id,
            ScheduledTask.status == STATUS_PENDING,
        )
        .values(status=STATUS_CANCELLED)
        .returning(ScheduledTask)
    )
    row = result.scalar_one_or_none()
    if row is not None:
        await db.commit()
        await db.refresh(row)
        return _to_view(row)

    # The claim matched nothing: either it is not theirs (None) or it is not
    # pending any more (NotCancellable). Two different answers.
    existing = (
        await db.execute(
            select(ScheduledTask).where(
                ScheduledTask.id == task_id,
                ScheduledTask.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if existing is None:
        return None
    raise NotCancellable(existing.status)


async def list_for_user(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    status: str | None = None,
    limit: int = 200,
) -> list[ScheduledTaskView]:
    """This user's tasks, in time order (what the Calendar renders).

    `run_at` ascending, not newest-first like the notification feed: a task list
    is a plan, and a plan reads forwards. `status` is an optional filter and the
    only one — V0 has no other dimension to filter on.
    """
    query = select(ScheduledTask).where(ScheduledTask.user_id == user_id)
    if status is not None:
        query = query.where(ScheduledTask.status == status)
    rows = (
        (await db.execute(query.order_by(ScheduledTask.run_at.asc()).limit(limit)))
        .scalars()
        .all()
    )
    return [_to_view(row) for row in rows]


async def get_for_user(
    db: AsyncSession, *, user_id: uuid.UUID, task_id: uuid.UUID
) -> ScheduledTask | None:
    """One task if it is the caller's, as the persisted row.

    The ORM row rather than a view because `trigger` needs the entity it claims:
    ownership is checked here, once, by the same rule every read uses.
    """
    return (
        await db.execute(
            select(ScheduledTask).where(
                ScheduledTask.id == task_id,
                ScheduledTask.user_id == user_id,
            )
        )
    ).scalar_one_or_none()


# --- firing -----------------------------------------------------------------


async def trigger(
    db: AsyncSession, *, task: ScheduledTask
) -> ScheduledTaskView | None:
    """Claim the task and do what it says. The moment of truth.

    Two steps, in this order and no other:

      1. **Claim it, and commit that.** `pending -> executed` is a single
         conditional UPDATE, so of any number of callers racing the same task
         exactly one sees a row back; everybody else gets None and does nothing.
         This is the whole duplicate-prevention mechanism — no lock table, no
         worker lease, no "check then act" that a restart can slip through.
      2. **Hand it to the handler** for its `type`. The handler is the only place
         that knows what the task means; today that is `notification`, which
         passes the payload to the Notification Sender.

    The claim is committed before the side effect, so a failure cannot be
    retried into a duplicate: if the handler raises, the task is marked `failed`
    with the reason and stays failed. V1's outbox would move the claim to
    *after* a successful delivery to get retries too; V0 chooses "never twice".
    """
    claimed = (
        await db.execute(
            update(ScheduledTask)
            .where(
                ScheduledTask.id == task.id,
                ScheduledTask.status == STATUS_PENDING,
            )
            .values(status=STATUS_EXECUTED, executed_at=func.now())
            .returning(ScheduledTask)
        )
    ).scalar_one_or_none()
    if claimed is None:
        # Already fired, cancelled, or claimed by another tick. Doing nothing is
        # the correct behaviour, not an error.
        logger.debug("scheduler: task %s was not pending; skipping", task.id)
        return None
    await db.commit()
    await db.refresh(claimed)

    handler = _HANDLERS.get(claimed.type)
    if handler is None:  # pragma: no cover — schedule() refuses unknown types
        return await _record_failure(db, claimed, f"unknown task type: {claimed.type}")

    try:
        await handler(db, task=claimed)
    except Exception as exc:  # noqa: BLE001 — the task's outcome is a record, not a crash
        logger.exception("scheduler: task %s failed to deliver", claimed.id)
        return await _record_failure(db, claimed, f"{type(exc).__name__}: {exc}")
    return _to_view(claimed)


async def _record_failure(
    db: AsyncSession, task: ScheduledTask, message: str
) -> ScheduledTaskView:
    """Mark a claimed task failed, with the reason, and never retry it."""
    task.status = STATUS_FAILED
    task.error = message[:ERROR_MAX_CHARS]
    await db.commit()
    await db.refresh(task)
    return _to_view(task)


async def run_due(
    db: AsyncSession, *, now: datetime | None = None, limit: int = DUE_BATCH
) -> list[ScheduledTaskView]:
    """One tick: fire every pending task whose time has come.

    `now` is a parameter rather than a call to the clock so the behaviour is
    testable without waiting: everything that decides "is it due" reads this one
    value (tests/services/test_scheduler_db.py drives both the past and the
    future with it).
    """
    moment = now or datetime.now(UTC)
    due = (
        (
            await db.execute(
                select(ScheduledTask)
                .where(
                    ScheduledTask.status == STATUS_PENDING,
                    ScheduledTask.run_at <= moment,
                )
                .order_by(ScheduledTask.run_at.asc())
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )

    fired: list[ScheduledTaskView] = []
    for task in due:
        result = await trigger(db, task=task)
        if result is not None:
            fired.append(result)
    return fired


async def count_pending(db: AsyncSession) -> int:
    """How many promises are still outstanding.

    Read when the loop starts, so a restart can report what it inherited. The
    number is also the honest answer to "did the restart lose anything?" — but
    read it from the table (or from `list_for_user`), not from the log: this app
    does not configure logging, so only WARNING and above reach the console by
    default.
    """
    result = await db.execute(
        select(func.count())
        .select_from(ScheduledTask)
        .where(ScheduledTask.status == STATUS_PENDING)
    )
    return int(result.scalar_one())


async def run_forever(poll_seconds: float) -> None:
    """The clock: ask "is anything due?" every `poll_seconds`, forever.

    Started by the app's lifespan and cancelled when it shuts down. It owns no
    state — every tick re-reads the table — which is exactly why a restart is
    uneventful: whatever came due while the process was gone is due on the next
    tick, and nothing has to be restored by hand.

    A failing tick is logged and swallowed: a database blip must not kill the
    clock, or the Scheduler would stop for good after one bad minute.

    The lines below are INFO, which this app does not surface today (nothing
    configures logging, so uvicorn prints WARNING and above only). They are here
    for whoever wires a log config, and they are deliberately not the evidence:
    the evidence is in the table — `status`, `executed_at`, `error` — which is
    what the verification script reads.
    """
    try:
        async with AsyncSessionLocal() as db:
            pending = await count_pending(db)
        logger.info(
            "scheduler: started, poll=%ss, %s pending task(s) recovered",
            poll_seconds,
            pending,
        )
    except Exception:  # noqa: BLE001 — a broken first probe must not stop the loop
        logger.warning("scheduler: could not read pending tasks at startup", exc_info=True)

    while True:
        try:
            async with AsyncSessionLocal() as db:
                fired = await run_due(db)
            if fired:
                logger.info(
                    "scheduler: fired %s task(s): %s",
                    len(fired),
                    ", ".join(f"{t.id}={t.status}" for t in fired),
                )
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001 — see docstring: the clock must survive
            logger.exception("scheduler: tick failed")
        await asyncio.sleep(poll_seconds)


# --- handlers: `type` -> what to actually do --------------------------------
#
# One entry today. The registry exists so the next one (email, push, a Global
# Agent action) is a function and a dict entry, not a change to `trigger`.

async def _notify(db: AsyncSession, *, task: ScheduledTask) -> None:
    """Hand the payload to the Notification Sender, unchanged.

    This is the entire Scheduler → Sender contract: build the notification from
    what the caller wrote, tag it with its provenance, call `send()`. The
    Scheduler does not touch the feed, the browser, or the notification rows —
    `send()` owns all of that, and `scheduledTaskId` in the metadata is how a
    delivered notification can be traced back to the promise that produced it.
    """
    payload = dict(task.payload or {})
    metadata = dict(payload.get("metadata") or {})
    # Provenance, not content: the id of the promise that produced this
    # notification, so a delivered item can be traced back to its task.
    metadata["scheduledTaskId"] = str(task.id)
    await notification_service.send(
        db,
        user_id=task.user_id,
        notification=NotificationInput(
            title=str(payload.get("title", "")),
            body=str(payload.get("body", "")),
            type=str(payload.get("type", notification_service.DEFAULT_TYPE)),
            metadata=metadata,
        ),
    )


_HANDLERS: dict[
    str, Callable[..., Awaitable[None]]
] = {
    TYPE_NOTIFICATION: _notify,
}


def _to_view(row: ScheduledTask) -> ScheduledTaskView:
    return ScheduledTaskView(
        id=row.id,
        run_at=row.run_at,
        type=row.type,
        payload=dict(row.payload or {}),
        status=row.status,
        created_at=row.created_at,
        executed_at=row.executed_at,
        error=row.error,
    )


__all__ = [
    "DUE_BATCH",
    "InvalidTask",
    "NotCancellable",
    "ScheduledTaskView",
    "TASK_TYPES",
    "TYPE_NOTIFICATION",
    "TaskInput",
    "cancel",
    "count_pending",
    "is_due",
    "list_for_user",
    "run_due",
    "run_forever",
    "schedule",
    "trigger",
    "validate",
]
