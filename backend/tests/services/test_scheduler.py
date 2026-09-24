"""Scheduler — the properties that make it a Scheduler, DB-free.

Three claims, and each is a thing a reviewer should be able to reject this code
on:

  * **It has exactly one dependency edge.** The Scheduler calls the Notification
    Sender and nothing else: no `ai/`, no Global Agent, no Learner State, no
    Space Memory, no doc layer. A Scheduler that could read the learner's state
    would start deciding *whether* to remind, which is the Coordinator's job and
    explicitly not this feature's.
  * **It refuses un-keepable promises at the door.** An unknown type, a
    notification payload with no title, or a timestamp with no offset raises
    before anything is stored — a promise that can never be kept must fail while
    the caller is still there to see it.
  * **"Is it due?" is one pure function.** Status *and* time, nothing else: a
    task in the future is not due, a task that already fired is not due even if
    its time has passed, and a past time on a pending task means "due now" (that
    is how an overdue task survives a restart).

What is NOT here: whether a row actually lands, whether the claim really happens
only once, whether the notification reaches the feed. Those are database
behaviour and live in `test_scheduler_db.py`.
"""

from __future__ import annotations

import ast
import pathlib
import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest

from models.scheduled_task import (
    STATUS_CANCELLED,
    STATUS_EXECUTED,
    STATUS_FAILED,
    STATUS_PENDING,
    ScheduledTask,
)
from services import scheduler_service
from services.scheduler_service import (
    TASK_TYPES,
    TYPE_NOTIFICATION,
    InvalidTask,
    TaskInput,
    is_due,
    validate,
)

MODULE_PATH = pathlib.Path(scheduler_service.__file__)

# Everything the Scheduler is allowed to reach for. `services.notification_service`
# is checked separately because it is the ALLOWED edge and worth naming.
ALLOWED_IMPORT_ROOTS = {
    "__future__",
    "asyncio",
    "collections",
    "dataclasses",
    "datetime",
    "logging",
    "typing",
    "uuid",
    "sqlalchemy",
    "core",
    "models",
    "services",
}


def _imported_targets() -> set[str]:
    """Every dotted name the module imports, `from X import y` included as X.y."""
    tree = ast.parse(MODULE_PATH.read_text(encoding="utf-8"))
    targets: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            targets.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            targets.update(f"{node.module}.{alias.name}" for alias in node.names)
    return targets


def _imported_roots() -> set[str]:
    return {target.split(".")[0] for target in _imported_targets()}


def test_the_only_edge_out_is_the_notification_sender():
    """Scheduler -> Notification Sender. Any second domain import fails here."""
    domain = {
        # `from services.x import Y` and `from services import x` both mean the
        # same dependency; normalise to the module.
        ".".join(target.split(".")[:2])
        for target in _imported_targets()
        if target.startswith("services.")
    }
    assert domain == {"services.notification_service"}


def test_the_scheduler_knows_no_agent_state():
    assert _imported_roots() <= ALLOWED_IMPORT_ROOTS
    assert "ai" not in _imported_roots()


def test_it_exposes_the_four_operations_the_brief_names():
    public = {name for name in scheduler_service.__all__ if not name[:1].isupper()}
    assert {"schedule", "cancel", "list_for_user", "trigger"} <= public


def test_exactly_one_task_type_for_now():
    assert TASK_TYPES == (TYPE_NOTIFICATION,)
    assert TaskInput(run_at=datetime.now(UTC)).type == TYPE_NOTIFICATION


# --- "is it due?" -----------------------------------------------------------


def _task(*, status: str, offset_seconds: int) -> SimpleNamespace:
    return SimpleNamespace(
        status=status, run_at=datetime.now(UTC) + timedelta(seconds=offset_seconds)
    )


def test_a_pending_task_in_the_future_is_not_due():
    assert is_due(_task(status=STATUS_PENDING, offset_seconds=60), now=datetime.now(UTC)) is False


def test_a_pending_task_whose_time_has_come_is_due():
    assert is_due(_task(status=STATUS_PENDING, offset_seconds=-1), now=datetime.now(UTC)) is True


def test_an_overdue_pending_task_is_just_due():
    """The restart case: the process was down when the time came. It must fire on
    the next tick, not be skipped as "too late"."""
    overdue = _task(status=STATUS_PENDING, offset_seconds=-6 * 3600)
    assert is_due(overdue, now=datetime.now(UTC)) is True


@pytest.mark.parametrize("status", [STATUS_EXECUTED, STATUS_CANCELLED, STATUS_FAILED])
def test_a_task_that_is_no_longer_pending_is_never_due(status):
    """Even if its time has passed — this is what makes a restart safe: the row
    says it already happened, so the clock walks past it."""
    assert is_due(_task(status=status, offset_seconds=-1), now=datetime.now(UTC)) is False


# --- what the Scheduler refuses ---------------------------------------------


def test_a_naive_timestamp_is_refused():
    """No offset means a guess about which clock the caller meant, and the whole
    feature is "has this moment passed?"."""
    with pytest.raises(InvalidTask) as excinfo:
        validate(TaskInput(run_at=datetime(2026, 9, 25, 19, 0, 0)))
    assert "timezone-aware" in str(excinfo.value)


def test_an_aware_timestamp_in_any_offset_is_accepted():
    """+08:00 is not UTC, and that is fine — it says which clock it means."""
    plus_eight = datetime(2026, 9, 25, 19, 0, 0, tzinfo=UTC).astimezone()
    assert plus_eight.utcoffset() != timedelta(0)
    task = TaskInput(run_at=plus_eight, payload={"title": "Review reminder"})
    assert validate(task).run_at == plus_eight


def test_a_past_timestamp_is_legal():
    """It means "due now" (an overdue task, or a caller catching up), which is
    why it is not refused the way a naive one is."""
    past = datetime.now(UTC) - timedelta(hours=3)
    task = TaskInput(run_at=past, payload={"title": "Review reminder"})
    assert validate(task).run_at == past


def test_an_unknown_task_type_is_refused():
    with pytest.raises(InvalidTask) as excinfo:
        validate(
            TaskInput(
                run_at=datetime.now(UTC),
                type="send_email",
                payload={"to": "a@b.c"},
            )
        )
    assert "send_email" in str(excinfo.value)


def test_a_notification_without_a_title_is_refused():
    with pytest.raises(InvalidTask) as excinfo:
        validate(TaskInput(run_at=datetime.now(UTC), payload={"body": "no title"}))
    assert "title" in str(excinfo.value)


def test_a_blank_title_is_refused_too():
    with pytest.raises(InvalidTask):
        validate(TaskInput(run_at=datetime.now(UTC), payload={"title": "   "}))


def test_a_malformed_payload_is_refused():
    with pytest.raises(InvalidTask):
        validate(TaskInput(run_at=datetime.now(UTC), payload={"title": "x", "body": 7}))
    with pytest.raises(InvalidTask):
        validate(
            TaskInput(run_at=datetime.now(UTC), payload={"title": "x", "metadata": "nope"})
        )


def test_a_good_notification_task_passes_validation_unchanged():
    task = TaskInput(
        run_at=datetime.now(UTC),
        payload={"title": "Review reminder", "body": "Eigenvector"},
    )
    assert validate(task) is task


def test_the_model_statuses_are_the_four_the_design_names():
    assert {STATUS_PENDING, STATUS_EXECUTED, STATUS_FAILED, STATUS_CANCELLED} == {
        "pending",
        "executed",
        "failed",
        "cancelled",
    }
    # A row inserted without a status is pending — the default lives on the
    # column, so even a hand-written INSERT cannot create something "already
    # done" or, worse, something with no state at all.
    assert ScheduledTask.__table__.c.status.default.arg == STATUS_PENDING
