"""The single door into Learner State — and the way back to where a row came from.

Two surfaces write evidence today — the Global Agent's `record_evidence` tool
and `POST /knowledge/evidence` — and before this module each assembled its own
`KnowledgeEvidenceIn` and called `knowledge_service.record_evidence` directly.
That is two places to keep in step, and the one thing they must never disagree
about is *what counts*.

So the translation lives here, once:

    a surface's outcome + where it came from
        -> admit_outcome(scope_ref, outcome, provenance)
        -> knowledge_service.record_evidence(...)   (persistence)

Three things this module owns, and nothing else:

  * **The scope mapping.** `scope_ref` is opaque — the core does not know what a
    "space" is, and the wire format (`space:<uuid>`) is parsed in exactly one
    place, below. A future surface (a course, a question bank) adds a prefix
    here rather than teaching the core about products.
  * **The translation** from a surface's vocabulary to the evidence contract.
  * **The provenance** — its shape, and the read-back that answers "which
    evidence came from this conversation". It rides in the existing
    `knowledge_evidence.response_ref` JSONB column, so the causal trace costs no
    migration; see `Provenance` and the reverse reads at the bottom.

It owns **no policy**. Whether a row may be written, and whether it counts, is
`ai.knowledge.admit` — the core's. This module only decides where the row goes.
"""

from __future__ import annotations

import uuid
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import CoordinatorDecision, KnowledgeEvidence, KnowledgeItem
from schemas.knowledge import KnowledgeEvidenceIn, KnowledgeEvidenceOut
from services import knowledge_service

# The one scope form that exists today. Evidence must belong to a space
# (`knowledge_evidence.project_id` is NOT NULL), and a space is the only thing
# that owns a knowledge structure — see the plan's §2.2.
SCOPE_SPACE = "space:"

# The provenance keys, inside `response_ref`. Spelled once, here, because this
# module owns the shape and the reverse reads below must agree with the writes.
KEY_SURFACE = "surface"
KEY_CONVERSATION = "conversationId"
KEY_DECISION = "decisionId"


def space_scope(project_id: uuid.UUID) -> str:
    """The opaque scope reference for a space. Callers pass this, not a project."""
    return f"{SCOPE_SPACE}{project_id}"


def project_from_scope(scope_ref: str) -> uuid.UUID:
    """Map an opaque scope reference back to the space it names.

    Refuses an unknown form rather than guessing: evidence written against the
    wrong scope is indistinguishable from correct evidence afterwards, and would
    silently move a learner's state.
    """
    if not scope_ref.startswith(SCOPE_SPACE):
        raise knowledge_service.EvidenceRejected("unknown_scope", scope=scope_ref)
    try:
        return uuid.UUID(scope_ref[len(SCOPE_SPACE) :])
    except ValueError as exc:
        raise knowledge_service.EvidenceRejected(
            "unknown_scope", scope=scope_ref
        ) from exc


def _as_uuid(value: object) -> uuid.UUID | None:
    """An id out of a JSONB bag, or None — never a guess."""
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError):
        return None


@dataclass(frozen=True)
class Provenance:
    """Where one piece of evidence came from.

    Deliberately small. A surface reports `surface` (the same "chat"/"api"
    vocabulary the Coordinator already uses for event sources) plus whichever
    identifier it actually holds; nothing is inferred, because a wrong
    attribution is invisible afterwards — the same reason `resolve_item` refuses
    to guess an item.

    `decisionId` is the one key no V0 surface fills: it names the Coordinator
    decision that prompted the interaction, and the action loop that would
    supply one is V1's. The key is carried, not invented — a REST caller may
    pass it in `extra` today, and the reverse read already honours it.
    """

    surface: str
    conversation_id: uuid.UUID | None = None
    # A surface may already carry a free-form `responseRef` (the REST contract's
    # field). It rides along untouched: this module adds provenance, it does not
    # replace what the caller recorded.
    extra: Mapping[str, Any] = field(default_factory=dict)

    def to_ref(self) -> dict[str, Any]:
        ref: dict[str, Any] = dict(self.extra)
        ref[KEY_SURFACE] = self.surface
        if self.conversation_id is not None:
            ref[KEY_CONVERSATION] = str(self.conversation_id)
        return ref


@dataclass(frozen=True)
class Outcome:
    """One interaction's result, before it becomes evidence.

    Domain-neutral on purpose: it names no project, no space and no surface. A
    surface reports what happened; this module decides where it is written.
    """

    verdict: str
    tier: str = "A"
    # Mandatory for tier B — but that rule is the core's (`admit`), not this
    # module's; it is carried here, not enforced here.
    reasoning: str | None = None
    # Either the resolved item, or a label the space resolves itself. The chat
    # tool resolves first (it must not invent topics); the REST surface speaks
    # labels and lets the space create one.
    item_id: uuid.UUID | None = None
    item_label: str | None = None
    independent: bool = True
    hint_used: bool = False


async def admit_outcome(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    scope_ref: str,
    outcome: Outcome,
    provenance: Provenance,
) -> KnowledgeEvidenceOut:
    """Turn one surface's outcome into one evidence row, through the one door.

    `scope_ref` is opaque and is only ever mapped to a project_id here. The write
    policy is not re-decided here either: `record_evidence` defers to
    `ai.knowledge.admit`, so every surface gets the same answer to "may this be
    written", and `EvidenceRejected` travels back out unchanged for the caller to
    turn into a 4xx or a tool-loop correction.
    """
    project_id = project_from_scope(scope_ref)
    return await knowledge_service.record_evidence(
        db,
        project_id=project_id,
        user_id=user_id,
        payload=KnowledgeEvidenceIn(
            project_id=project_id,
            item_id=outcome.item_id,
            item_label=outcome.item_label,
            verdict=outcome.verdict,
            tier=outcome.tier,
            independent=outcome.independent,
            hint_used=outcome.hint_used,
            reasoning=outcome.reasoning,
            response_ref=provenance.to_ref(),
        ),
    )


# --- the way back: which evidence came from what -----------------------------


@dataclass(frozen=True)
class TracedEvidence:
    """One evidence row with its provenance — what a reverse lookup returns.

    Deliberately not `KnowledgeEvidenceOut`: that contract has no provenance
    field, so a trace built from it would hide the very thing being asked about.
    """

    id: uuid.UUID
    item_label: str | None
    verdict: str
    tier: str
    surface: str | None
    conversation_id: uuid.UUID | None
    decision_id: uuid.UUID | None
    created_at: datetime


def _traced(row: KnowledgeEvidence, label: str | None) -> TracedEvidence:
    ref = row.response_ref or {}
    return TracedEvidence(
        id=row.id,
        item_label=label,
        verdict=row.verdict,
        tier=row.tier,
        surface=ref.get(KEY_SURFACE),
        conversation_id=_as_uuid(ref.get(KEY_CONVERSATION)),
        decision_id=_as_uuid(ref.get(KEY_DECISION)),
        created_at=row.created_at,
    )


def _evidence_query():
    """Evidence joined to its item's label, so a trace can be read without a
    second lookup per row."""
    return select(KnowledgeEvidence, KnowledgeItem.label).join(
        KnowledgeItem, KnowledgeItem.id == KnowledgeEvidence.item_id, isouter=True
    )


async def evidence_from_conversation(
    db: AsyncSession, *, user_id: uuid.UUID, conversation_id: uuid.UUID
) -> list[TracedEvidence]:
    """Every piece of evidence a conversation produced, oldest first.

    The "会话 id" direction of the causal read: the chat surface stamps each row
    it writes with its conversation, so a conversation can be asked what it left
    behind in Learner State.
    """
    result = await db.execute(
        _evidence_query()
        .where(
            KnowledgeEvidence.user_id == user_id,
            KnowledgeEvidence.response_ref[KEY_CONVERSATION].astext
            == str(conversation_id),
        )
        .order_by(KnowledgeEvidence.created_at)
    )
    return [_traced(row, label) for row, label in result.all()]


async def evidence_for_decision(
    db: AsyncSession, *, user_id: uuid.UUID, decision_id: uuid.UUID
) -> list[TracedEvidence]:
    """Every piece of evidence tied to one Coordinator decision, oldest first.

    Two ties, and the difference is worth stating rather than blurring:

      * **the row the decision was made about** — the decision log already names
        it (`event_payload.evidenceId`), so this direction is exact today;
      * **rows the decision caused** — evidence written by a surface that knew
        which decision prompted it (`response_ref.decisionId`). No V0 surface
        knows one, so in practice this is the first kind only.
    """
    decision = (
        await db.execute(
            select(CoordinatorDecision).where(
                CoordinatorDecision.id == decision_id,
                CoordinatorDecision.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if decision is None:
        return []

    caused = await db.execute(
        _evidence_query()
        .where(
            KnowledgeEvidence.user_id == user_id,
            KnowledgeEvidence.response_ref[KEY_DECISION].astext == str(decision_id),
        )
        .order_by(KnowledgeEvidence.created_at)
    )
    traced = [_traced(row, label) for row, label in caused.all()]

    triggered = _as_uuid((decision.event_payload or {}).get("evidenceId"))
    if triggered is not None and all(row.id != triggered for row in traced):
        result = await db.execute(
            _evidence_query().where(
                KnowledgeEvidence.id == triggered,
                KnowledgeEvidence.user_id == user_id,
            )
        )
        found = result.first()
        if found is not None:
            traced.append(_traced(*found))
            traced.sort(key=lambda row: row.created_at)
    return traced


__all__ = [
    "KEY_CONVERSATION",
    "KEY_DECISION",
    "KEY_SURFACE",
    "SCOPE_SPACE",
    "Outcome",
    "Provenance",
    "TracedEvidence",
    "admit_outcome",
    "evidence_for_decision",
    "evidence_from_conversation",
    "project_from_scope",
    "space_scope",
]