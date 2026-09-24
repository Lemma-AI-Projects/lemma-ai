"""API contract for the Coordinator. Wire format is camelCase.

Two read surfaces, and deliberately no write surface:

  - `CoordinatorDecisionOut` — one recorded decision: the event it reacted to,
    what it decided, why, and what the executor did.
  - `ExplanationOut` — a dry run: the snapshot the Coordinator read and the
    decision it would make, with nothing executed and nothing recorded.

There is no `POST /coordinator/events`. The Coordinator is invoked by the write
paths that know an event happened (the evidence tool and the evidence route),
in-process, on the request's own session — that is the "minimal invocation
mechanism" this V0 needs, and an HTTP door would let a caller announce an event
that never happened. A second producer (a scheduler tick, an agent turn ending)
can add one when it exists, with the rule it needs.
"""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _Out(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


class CoordinatorEventOut(_Out):
    type: str
    payload: dict[str, Any]
    source: str


class FocusItemOut(_Out):
    id: str
    label: str
    value: str
    origin: str | None
    evidence_count: int
    last_confirmed_at: datetime | None
    # The value before this event's evidence — what makes a lapse readable.
    previous_value: str


class EvidenceFactOut(_Out):
    item_label: str
    verdict: str
    tier: str
    created_at: datetime | None


class DecisionOut(_Out):
    action: str
    target: str | None
    reason: str
    urgency: str
    payload: dict[str, Any]


class SnapshotOut(_Out):
    """What the decision was allowed to look at. Nothing hidden, nothing extra."""

    event: CoordinatorEventOut
    current_time: datetime
    space_id: str | None
    focus: FocusItemOut | None
    mastered: tuple[str, ...]
    ready: tuple[str, ...]
    developing: tuple[str, ...]
    unassessed_count: int
    recent_evidence: tuple[EvidenceFactOut, ...]
    recent_memory: tuple[str, ...]
    available_actions: tuple[str, ...]
    goal: str | None


class ExplanationOut(_Out):
    snapshot: SnapshotOut
    decision: DecisionOut


class CoordinatorDecisionOut(_Out):
    """One row of the decision log."""

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
