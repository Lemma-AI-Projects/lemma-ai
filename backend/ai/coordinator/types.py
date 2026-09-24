"""The Coordinator's vocabulary: an event in, one decision out.

Nothing here reads a database or calls a model. A decision is a pure function of
a `Snapshot`, and a `Snapshot` is a distilled view of state the rest of the
system already owns (Learner State, evidence, memory). The Coordinator is
allowed to *read* those; it is not allowed to redefine them, and it never writes
any of them (the only thing it produces is a decision, see
`services/coordinator_service.py`).

Why a snapshot instead of the database: the Coordinator's question is "given
what just happened and where the learner stands, is there anything to do?" — and
answering it needs a handful of facts, not the schema. Handing it a session
would invite joins, and joins are how a decision layer starts modelling domains
it does not own.

Two conventions worth stating once:

  * **The state is pre-derived.** `mastered` / `ready` / `developing` arrive as
    labels computed by `ai/knowledge/state.py`. The Coordinator never derives
    knowledge itself and never sees a probability — there are none to see.
  * **`metadata`-free on purpose.** A `Decision` carries `action`, `target`,
    `reason`, `urgency` and a machine-readable `payload` — but no user-facing
    copy. Wording belongs to whoever delivers the decision (the Global Agent, or
    the notification executor); a Coordinator that wrote sentences would be a
    second author of the product's voice.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any

# The event that exists today. V0 implements exactly this one and refuses every
# other name — an accepted-but-unhandled event would be a decision nobody can
# explain. `evidence.created`, `goal.changed`, `user.requested_next_step` and
# `scheduler.triggered` are the documented next ones (see the module docstring in
# `services/coordinator_service.py`), and each needs a rule, not just a name.
EVENT_LEARNER_STATE_UPDATED = "learner_state.updated"
SUPPORTED_EVENTS = (EVENT_LEARNER_STATE_UPDATED,)

# Who announced the event. This is the caller's own statement about where the
# evidence came from, and it is the one field that changes *delivery*:
# "chat" means a conversation is live (there is somebody to teach right now),
# anything else means there is no room to speak into.
SOURCE_CHAT = "chat"
SOURCE_API = "api"
EVENT_SOURCES = (SOURCE_CHAT, SOURCE_API)


class Action(StrEnum):
    """What to do. Five values, and no more in V0.

    Deliberately NOT method names: `INTRODUCE` says "this item is ready, teach
    it", not *how* to teach it. Method selection is a later layer that reads this
    decision; pinning `Socratic` or `DirectExplanation` here would freeze a
    system that has not been designed yet.
    """

    NO_ACTION = "NO_ACTION"
    CONTINUE = "CONTINUE"  # stay on the item the learner is working on
    REVIEW = "REVIEW"  # go back over something they had
    INTRODUCE = "INTRODUCE"  # start the item that just became learnable
    NOTIFY = "NOTIFY"  # reach the learner outside a live conversation


class Urgency(StrEnum):
    """How much it matters. V0 derives it from the action, deterministically —
    there is no ranking model, and a made-up score would look like one."""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"


class Finding(StrEnum):
    """What the snapshot says is true, *before* delivery is considered.

    The rules produce a finding, then the delivery rule may turn it into
    `NOTIFY`. Keeping the two apart is what makes the reason strings honest:
    "「特征值」的前提都已具备" is a fact about the learner; "→ 通知送达" is a
    consequence of nobody being in the room.
    """

    NONE = "none"
    NEXT_STEP = "next_step"  # something became learnable
    LAPSE = "lapse"  # they had it, this attempt failed
    STRUGGLE = "struggle"  # still learning it, no success yet
    UNSETTLED = "unsettled"  # the write did not decide anything


@dataclass(frozen=True)
class CoordinatorEvent:
    """One thing that happened, as the caller reports it."""

    type: str
    payload: dict[str, Any] = field(default_factory=dict)
    # Empty for an event that is not about a room.
    source: str = SOURCE_API

    @property
    def from_conversation(self) -> bool:
        return self.source == SOURCE_CHAT


@dataclass(frozen=True)
class FocusItem:
    """The item the event is about, after the state was recomputed."""

    id: str
    label: str
    # "mastered" | "not_mastered" | "unassessed".
    value: str
    origin: str | None
    evidence_count: int
    last_confirmed_at: datetime | None
    # What this item's value was BEFORE the event's evidence was written —
    # recomputed by the same pure derivation over the evidence minus this row.
    # It is what separates a lapse ("they had it, now they don't") from a
    # struggle ("they never had it"), and neither can be read off the new value
    # alone.
    previous_value: str = "unassessed"

    @property
    def was_mastered(self) -> bool:
        return self.previous_value == "mastered"


@dataclass(frozen=True)
class EvidenceFact:
    """One recent record, as the snapshot shows it. A fact, not a score."""

    item_label: str
    verdict: str
    tier: str
    created_at: datetime | None


@dataclass(frozen=True)
class Snapshot:
    """Everything the decision may look at — and nothing else."""

    event: CoordinatorEvent
    current_time: datetime
    space_id: str | None
    space_name: str | None
    focus: FocusItem | None
    mastered: tuple[str, ...] = ()
    ready: tuple[str, ...] = ()
    developing: tuple[str, ...] = ()
    unassessed_count: int = 0
    recent_evidence: tuple[EvidenceFact, ...] = ()
    recent_memory: tuple[str, ...] = ()
    # The action space, carried in the snapshot so a decision can never name an
    # action the system does not have (and so a future model-based policy could
    # be constrained with it).
    available_actions: tuple[str, ...] = ()
    # V0 has no goal anywhere in the repo (the brief reports `goal: null`), so
    # this is always None. It is a field, not an omission, so that a goal write
    # surface can arrive without re-cutting the snapshot.
    goal: str | None = None

    @property
    def has_state(self) -> bool:
        """Is there a knowledge structure to reason about at all?"""
        return bool(self.mastered or self.ready or self.developing or self.focus)


@dataclass(frozen=True)
class Decision:
    """One thing to do, or an honest nothing.

    `payload` is machine-readable extras for the executor (`{"itemId": ...}`).
    It is never user-facing copy.
    """

    action: Action
    target: str | None
    reason: str
    urgency: Urgency = Urgency.NORMAL
    payload: dict[str, Any] = field(default_factory=dict)

    @property
    def is_action(self) -> bool:
        return self.action is not Action.NO_ACTION


def decision_wire(decision: Decision) -> dict[str, Any]:
    """The decision as the API/log carries it. One place, so the frontend and the
    log cannot disagree about the shape."""
    return {
        "action": decision.action.value,
        "target": decision.target,
        "reason": decision.reason,
        "urgency": decision.urgency.value,
        "payload": dict(decision.payload),
    }


__all__ = [
    "Action",
    "CoordinatorEvent",
    "Decision",
    "EVENT_LEARNER_STATE_UPDATED",
    "EVENT_SOURCES",
    "EvidenceFact",
    "Finding",
    "FocusItem",
    "SOURCE_API",
    "SOURCE_CHAT",
    "SUPPORTED_EVENTS",
    "Snapshot",
    "Urgency",
    "decision_wire",
]
