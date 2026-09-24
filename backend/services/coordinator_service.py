"""Coordinator, wired to the rest of the system.

The decision itself lives in `ai/coordinator` and is pure. This module is the
part that touches the world, and it does exactly three things:

    1. **Build the snapshot** — read Learner State (already derived), the recent
       evidence, and the space's memories, and hand the decision nothing else.
    2. **Ask for the decision** — `ai.coordinator.decide(snapshot)`.
    3. **Run the executor** and record what it did in `coordinator_decisions`.

    event ──► snapshot ──► decide() ──► executor ──► effect
                                  │
                                  └──► coordinator_decisions (the record)

Boundaries this module enforces, because they are the feature:

  * **It never writes a state.** Not Learner State, not memory, not the
    knowledge structure. The only writes it makes are its own decision log and —
    when the decision is `NOTIFY` — a notification through the Notification
    Sender. `tests/services/test_coordinator_db.py` asserts the log and the
    notification, and that nothing else moved.
  * **It is not called on a loop.** One event, one decision, one effect, and it
    returns. There is no subscription, no queue and no polling: the two callers
    are the two places evidence actually gets written (the chat tool and the API
    route), and each of them announces the event after the write commits.
  * **It decides even when there is nothing to do**, and records it. An
    unexplained silence and an explained one look the same to a user; only one of
    them is debuggable.

Why there is no "the Coordinator asks the Global Agent" anywhere: the direction
is one-way by design. Whoever has something to say calls the Coordinator; the
Coordinator hands its answer back in the caller's return value (see the tool
result in `conversation_tool_service.record_evidence_handler`) or sends it
through the Notification Sender. It never calls back into a conversation.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.coordinator import (
    ACTION_VALUES,
    EVENT_LEARNER_STATE_UPDATED,
    SUPPORTED_EVENTS,
    Action,
    CoordinatorEvent,
    Decision,
    EvidenceFact,
    Finding,
    FocusItem,
    Snapshot,
    decide,
)
from ai.knowledge import derive_state
from ai.knowledge.state import StateValue
from models.coordinator_decision import CoordinatorDecision
from services import knowledge_service, notification_service, space_memory_service

logger = logging.getLogger(__name__)

# How much recent context the snapshot carries. Small on purpose: the rules only
# need the focus item, and the rest is there so the reason can be written for a
# human. A bigger window would cost queries and change no decision.
RECENT_EVIDENCE_CAP = 5
RECENT_MEMORY_CAP = 5
DEFAULT_LIST_LIMIT = 20


class UnsupportedEvent(ValueError):
    """An event name nothing handles. Refused, never silently ignored: the
    caller thinks it announced something, and a decision that never happens
    looks exactly like a decision of NO_ACTION."""

    def __init__(self, event_type: str) -> None:
        super().__init__(f"unsupported coordinator event: {event_type}")
        self.event_type = event_type


@dataclass(frozen=True)
class DecisionRecord:
    """A recorded decision, as the API and the dev panel read it."""

    id: uuid.UUID
    project_id: uuid.UUID | None
    event_type: str
    event_payload: dict[str, Any]
    action: str
    target: str | None
    reason: str
    urgency: str
    effect: str
    created_at: datetime


# --- snapshot ----------------------------------------------------------------


def _previous_value(
    items: list, edges: list, evidence: list, *, item_id: str, exclude_evidence_id
) -> str:
    """What the focus item's value was BEFORE this event's evidence landed.

    Recomputed with the same pure derivation over the same evidence minus the row
    that just arrived — no second source of truth, and no "previous" column
    anywhere. This is what tells a lapse ("they had it") from a struggle ("they
    never had it").

    The id comes off the event payload, so it is a string while the row's is a
    UUID: comparing them without coercing matches nothing, and the "previous"
    value then silently equals the current one — which turns every lapse into a
    struggle. Hence the explicit parse.
    """
    excluded = _as_uuid(exclude_evidence_id)
    without = [row for row in evidence if excluded is None or row.id != excluded]
    domain_items, domain_edges, domain_evidence = knowledge_service.to_domain(
        items, edges, without
    )
    previous = derive_state(domain_items, domain_edges, domain_evidence)
    return previous.value(item_id)


def _as_uuid(value: Any) -> uuid.UUID | None:
    if isinstance(value, uuid.UUID):
        return value
    if not value:
        return None
    try:
        return uuid.UUID(str(value))
    except ValueError:
        return None


def _event_evidence_id(event: CoordinatorEvent, evidence: list, *, focus_id: str):
    """Which record counts as "the event" when working out the previous value.

    Two modes, and they answer two different questions:

      * **A real event** names its evidence (`evidenceId`), and "previous" means
        "the state before this row landed" — the only reading that can tell a
        lapse from a struggle.
      * **A dry run** (`/coordinator/explain`) has no row, so it means "the state
        before the most recent record for this item" — which is the question a
        reviewer has right after something happened, and reproduces the decision
        that was just made.
    """
    named = _as_uuid(event.payload.get("evidenceId"))
    if named is not None or not focus_id:
        return named
    for row in reversed(evidence):
        if str(row.item_id) == focus_id:
            return row.id
    return None


async def build_snapshot(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    event: CoordinatorEvent,
    project_id: uuid.UUID | None,
) -> Snapshot:
    """The distilled view the decision is allowed to see."""
    now = datetime.now(UTC)
    if project_id is None:
        # No space: there is no learner state to reason about. The decision will
        # be NO_ACTION, and it is still recorded.
        return Snapshot(
            event=event,
            current_time=now,
            space_id=None,
            space_name=None,
            focus=None,
            available_actions=ACTION_VALUES,
        )

    state, fringes, items, edges = await knowledge_service.compute_state(
        db, project_id=project_id, user_id=user_id
    )
    evidence = await knowledge_service.list_evidence(
        db, project_id=project_id, user_id=user_id
    )
    labels = {str(row.id): row.label for row in items}

    focus: FocusItem | None = None
    focus_id = str(event.payload.get("itemId") or "")
    if focus_id and focus_id in {str(row.id) for row in items}:
        status = state.statuses.get(focus_id)
        focus = FocusItem(
            id=focus_id,
            label=labels.get(focus_id, focus_id),
            value=(status.value.value if status else StateValue.UNASSESSED.value),
            origin=(status.origin.value if status and status.origin else None),
            evidence_count=(status.evidence_count if status else 0),
            last_confirmed_at=(status.last_confirmed_at if status else None),
            previous_value=_previous_value(
                items,
                edges,
                evidence,
                item_id=focus_id,
                exclude_evidence_id=_event_evidence_id(
                    event, evidence, focus_id=focus_id
                ),
            ),
        )

    memories = await space_memory_service.list_for_space(
        db, user_id=user_id, project_id=project_id, limit=RECENT_MEMORY_CAP
    )

    return Snapshot(
        event=event,
        current_time=now,
        space_id=str(project_id),
        space_name=None,
        focus=focus,
        mastered=tuple(labels.get(i, i) for i in state.mastered_ids),
        ready=tuple(labels.get(i, i) for i in fringes.outer),
        developing=tuple(labels.get(i, i) for i in fringes.inner),
        unassessed_count=len(state.unassessed_ids),
        recent_evidence=tuple(
            EvidenceFact(
                item_label=labels.get(str(row.item_id), ""),
                verdict=row.verdict,
                tier=row.tier,
                created_at=row.created_at,
            )
            for row in reversed(evidence[-RECENT_EVIDENCE_CAP:])
        ),
        recent_memory=tuple(
            memory.text for memory, _source in (memories or [])[:RECENT_MEMORY_CAP]
        ),
        available_actions=ACTION_VALUES,
        goal=None,
    )


# --- executors ---------------------------------------------------------------
#
# One entry per action, and the whole executor vocabulary of V0. NOTIFY is the
# only action with a side effect the Coordinator performs itself; the other three
# are handed back to the caller, because the caller is a conversation that can
# act on them (the Global Agent) — that direction is the point (see module
# docstring).


async def _execute(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    project_id: uuid.UUID | None,
    decision: Decision,
) -> str:
    """Run the decision. Returns the effect string recorded in the log."""
    if decision.action is Action.NO_ACTION:
        return "nothing_to_do"

    if decision.action is Action.NOTIFY:
        return await _send_notification(
            db, user_id=user_id, project_id=project_id, decision=decision
        )

    # INTRODUCE / REVIEW / CONTINUE: the conversation that announced the event is
    # the executor. Nothing to do here — and nothing to notify about either.
    return "handed_to_global_agent"


async def _send_notification(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    project_id: uuid.UUID | None,
    decision: Decision,
) -> str:
    """`NOTIFY` -> the Notification Sender. The only side effect in V0.

    The wording is a template, not a message: V0 has no Method system and no
    Coordinator-authored copy, so the delivery layer composes the shortest honest
    sentence it can from the decision's own facts. When methods arrive, the
    wording belongs to them — this template exists so the channel is real today.
    """
    copy = _notification_copy(decision)
    try:
        sent = await notification_service.send(
            db,
            user_id=user_id,
            notification=notification_service.NotificationInput(
                title=copy["title"],
                body=copy["body"],
                type=notification_service.TYPE_REMINDER,
                metadata={
                    "source": "coordinator",
                    "action": decision.action.value,
                    "target": decision.target,
                    "projectId": str(project_id) if project_id else None,
                    "finding": decision.payload.get("finding"),
                },
            ),
        )
    except Exception as exc:  # noqa: BLE001 — the log is where a failure is visible
        logger.exception("coordinator: notification delivery failed")
        return f"notification_failed:{type(exc).__name__}"
    return f"notification_sent:{sent.id}"


def _notification_copy(decision: Decision) -> dict[str, str]:
    """Two templates and no third. Both say only what the decision knows."""
    focus_label = str(decision.payload.get("focusItemLabel") or decision.target or "")
    if decision.payload.get("finding") == Finding.LAPSE.value:
        return {
            "title": "复习提醒",
            "body": f"「{focus_label}」这次没做出来，回头再确认一次。",
        }
    target = decision.target or focus_label
    return {
        "title": "下一步可以学了",
        "body": f"「{target}」的前提都已具备，可以开始学它了。",
    }


# --- the one entry point -----------------------------------------------------


async def handle_event(
    db: AsyncSession, *, user_id: uuid.UUID, event: CoordinatorEvent
) -> DecisionRecord:
    """One event in, one recorded decision out. Strict: raises on a bad event.

    Callers that must not be broken by the Coordinator (the evidence write paths)
    use `handle_event_safely` instead — recording a learner's answer is more
    important than the decision about it.
    """
    if event.type not in SUPPORTED_EVENTS:
        raise UnsupportedEvent(event.type)

    project_id = None
    raw_project_id = event.payload.get("projectId")
    if raw_project_id:
        try:
            project_id = uuid.UUID(str(raw_project_id))
        except ValueError:
            project_id = None

    snapshot = await build_snapshot(
        db, user_id=user_id, event=event, project_id=project_id
    )
    decision = decide(snapshot)
    effect = await _execute(
        db, user_id=user_id, project_id=project_id, decision=decision
    )

    row = CoordinatorDecision(
        user_id=user_id,
        project_id=project_id,
        event_type=event.type,
        event_payload=dict(event.payload),
        action=decision.action.value,
        target=decision.target,
        reason=decision.reason,
        urgency=decision.urgency.value,
        effect=effect,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_record(row)


async def handle_event_safely(
    db: AsyncSession, *, user_id: uuid.UUID, event: CoordinatorEvent
) -> DecisionRecord | None:
    """`handle_event` for call sites that must not fail because of it.

    A broken decision must not fail the write that produced it: the learner's
    answer is already recorded, and losing it because a rule raised would trade a
    certain fact for an uncertain convenience. The failure is logged loudly and
    the event is dropped — which is itself recorded in the log's absence, the
    one place this design is weaker than an outbox.
    """
    try:
        return await handle_event(db, user_id=user_id, event=event)
    except Exception:  # noqa: BLE001 — see docstring
        logger.warning(
            "coordinator: event %s was not handled", event.type, exc_info=True
        )
        return None


# --- reads -------------------------------------------------------------------


@dataclass(frozen=True)
class Explanation:
    """A dry run: the snapshot the Coordinator would read and the decision it
    would make — with no executor run and nothing recorded."""

    snapshot: Snapshot
    decision: Decision


async def explain(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    project_id: uuid.UUID | None,
    item_id: uuid.UUID | None = None,
    source: str = "api",
) -> Explanation:
    """What would the Coordinator decide right now, and what did it look at?

    The dev panel's "why" button, and the reason this file exposes
    `build_snapshot` at all: a decision layer nobody can inspect is a black box,
    even when the rules inside it are twenty lines. It has no side effects by
    construction — `decide` is pure and this function never calls `_execute`.
    """
    event = CoordinatorEvent(
        type=EVENT_LEARNER_STATE_UPDATED,
        source=source,
        payload={
            "projectId": str(project_id) if project_id else None,
            "itemId": str(item_id) if item_id else None,
            "explain": True,
        },
    )
    snapshot = await build_snapshot(
        db, user_id=user_id, event=event, project_id=project_id
    )
    return Explanation(snapshot=snapshot, decision=decide(snapshot))


async def list_for_user(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    project_id: uuid.UUID | None = None,
    limit: int = DEFAULT_LIST_LIMIT,
) -> list[DecisionRecord]:
    """The decision log, newest first — what the audit panel shows."""
    query = select(CoordinatorDecision).where(CoordinatorDecision.user_id == user_id)
    if project_id is not None:
        query = query.where(CoordinatorDecision.project_id == project_id)
    rows = (
        (
            await db.execute(
                query.order_by(CoordinatorDecision.created_at.desc()).limit(limit)
            )
        )
        .scalars()
        .all()
    )
    return [_to_record(row) for row in rows]


def _to_record(row: CoordinatorDecision) -> DecisionRecord:
    return DecisionRecord(
        id=row.id,
        project_id=row.project_id,
        event_type=row.event_type,
        event_payload=dict(row.event_payload or {}),
        action=row.action,
        target=row.target,
        reason=row.reason,
        urgency=row.urgency,
        effect=row.effect,
        created_at=row.created_at,
    )


__all__ = [
    "DEFAULT_LIST_LIMIT",
    "DecisionRecord",
    "EVENT_LEARNER_STATE_UPDATED",
    "Explanation",
    "RECENT_EVIDENCE_CAP",
    "RECENT_MEMORY_CAP",
    "UnsupportedEvent",
    "build_snapshot",
    "explain",
    "handle_event",
    "handle_event_safely",
    "list_for_user",
]
