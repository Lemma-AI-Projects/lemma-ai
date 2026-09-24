"""Coordinator V0 — an event-driven decision layer.

The whole of it: something happens, the Coordinator reads a distilled snapshot of
state it does not own, and it answers one question —

    **现在要不要做什么，做什么？**

    types   the vocabulary: event, snapshot, decision (no I/O)
    rules   the decision itself, as a table of pure functions

What is deliberately NOT here: no learner-state model, no memory, no knowledge
structure, no methods, no scheduling, no delivery, no user-facing copy, and no
loop. It reads state that other layers own and writes nothing but a decision.

See `services/coordinator_service.py` for the part that touches the database,
picks the executor, and records the decision.
"""

from .rules import decide, find
from .types import (
    EVENT_LEARNER_STATE_UPDATED,
    EVENT_SOURCES,
    SOURCE_API,
    SOURCE_CHAT,
    SUPPORTED_EVENTS,
    Action,
    CoordinatorEvent,
    Decision,
    EvidenceFact,
    Finding,
    FocusItem,
    Snapshot,
    Urgency,
    decision_wire,
)

# Convenience for callers that need to enumerate the vocabulary (the API
# validator, the tests, a future constrained-decoding policy).
ACTION_VALUES = tuple(action.value for action in Action)

__all__ = [
    "ACTION_VALUES",
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
    "decide",
    "decision_wire",
    "find",
]
