"""Practice → Evidence: the one door, with two guards in front of it.

The rules this module exists to enforce, both of which have been violated
somewhere in this codebase already:

1. **A result with no reliable knowledge item does not become evidence.** Not a
   fuzzy one, not a label-matched one. `evidence_entry` refuses to guess an item
   for the same reason — a wrong attribution is invisible afterwards. So when
   neither an `item_id` nor an `item_label` is supplied, this returns
   `EvidenceOutcome.UNBINDABLE` and **does not call `admit_outcome`**.

2. **The same attempt is admitted once.** Retrying a submission, replaying a
   webhook, or a second caller picking up the same row must not produce two
   evidence rows for one interaction. The guard is on `response_ref`, which
   every path here fills with the surface's own attempt id.

⚠️ **What this module does not do**: it does not decide *whether the learner
knows something.* That is `ai.knowledge.admit` plus `derive_state`, and it stays
that way. A correct answer produces one piece of evidence, never a state claim.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from enum import Enum
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.evidence_entry import Outcome, Provenance, admit_outcome
from services.practice.contracts import PracticeEvaluation

#: The `surface` value practice reports. Shares the vocabulary the Coordinator
#: already uses for event sources, so a practice result and a chat result are
#: distinguishable in the same column.
SURFACE = "practice"


class EvidenceOutcome(str, Enum):
    ADMITTED = "admitted"
    #: Already admitted for this attempt — the call was a duplicate, not a failure.
    DUPLICATE = "duplicate"
    #: The evaluation carries no learning signal (`ungradable` / `pending`).
    NOT_SIGNALLING = "not_signalling"
    #: No `item_id` and no `item_label`: we cannot say *what* this is evidence of.
    UNBINDABLE = "unbindable"
    #: `admit_outcome` refused it. Carries the original exception's message.
    REJECTED = "rejected"


@dataclass(frozen=True)
class EvidenceResult:
    outcome: EvidenceOutcome
    detail: str | None = None
    evidence_id: uuid.UUID | None = None

    @property
    def admitted(self) -> bool:
        return self.outcome is EvidenceOutcome.ADMITTED


def _ref_for(reference: str) -> str:
    return f"practice_attempt:{reference}"


async def _already_admitted(
    db: AsyncSession, *, response_ref: str
) -> uuid.UUID | None:
    """Return the id of an evidence row already carrying this `response_ref`.

    ⚠️ This reads `knowledge_evidence` directly rather than going through a
    service, because the thing it is guarding is a *write*, and going through
    the service would mean calling the thing we are trying to not call twice.
    """
    from models.knowledge import KnowledgeEvidence  # local import: avoid cycle

    row = (
        await db.execute(
            select(KnowledgeEvidence.id, KnowledgeEvidence.response_ref)
            .where(KnowledgeEvidence.response_ref["surface"].astext() == SURFACE)
            .where(
                KnowledgeEvidence.response_ref["practiceRef"].astext() == response_ref
            )
            .limit(1)
        )
    ).first()
    return row[0] if row else None


async def submit_as_evidence(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    scope_ref: str,
    evaluation: PracticeEvaluation,
    item_id: uuid.UUID | None = None,
    item_label: str | None = None,
    surface_hint: str | None = None,
) -> EvidenceResult:
    """Offer one `PracticeEvaluation` to the existing evidence pipeline.

    `scope_ref` is the same opaque string the chat tool passes; `evidence_entry`
    is the only place that maps it to a project.
    """
    if not evaluation.is_signalling:
        return EvidenceResult(
            outcome=EvidenceOutcome.NOT_SIGNALLING,
            detail=f"verdict={evaluation.verdict} carries no learning signal",
        )

    if item_id is None and not item_label:
        # The Question Bank's items are keyed by an external catalogue id while
        # `knowledge_items` uses Lemma UUIDs, and no mapping exists yet. Guessing
        # here would write a confidently wrong attribution, which is worse than
        # writing nothing: it looks like knowledge and cannot be corrected later
        # without also correcting the derived state.
        return EvidenceResult(
            outcome=EvidenceOutcome.UNBINDABLE,
            detail="no item_id and no item_label — cannot say what this is evidence of",
        )

    response_ref = _ref_for(evaluation.reference)
    existing = await _already_admitted(db, response_ref=response_ref)
    if existing is not None:
        return EvidenceResult(
            outcome=EvidenceOutcome.DUPLICATE,
            detail="an evidence row already carries this attempt's reference",
            evidence_id=existing,
        )

    success = evaluation.counts_as_success
    outcome_kwargs: dict[str, Any] = {
        "item_id": item_id,
        "item_label": item_label,
        "reasoning": evaluation.detail.get("reasoning") or None,
        "independent": evaluation.hint_used is not True,
        "hint_used": bool(evaluation.hint_used),
    }
    if success is not None:
        # `verdict` is the word the core understands. A partial result has no
        # boolean form, so it is declared tier B (which requires reasoning) and
        # said so plainly, rather than being rounded to "wrong".
        outcome_kwargs["verdict"] = "correct" if success else "incorrect"
    else:
        # A partial result has no boolean form. ⚠️ `"partial"` is **not** one of
        # the three values `knowledge_evidence` accepts
        # (`VERDICTS = ("correct", "incorrect", "no_verdict")`, `models/knowledge.py:51`)
        # — so the honest encoding is `no_verdict` at tier B, which is also
        # exactly what that value was introduced for: a judgement was made, and
        # it did not resolve to a right/wrong answer. Rounding it to `incorrect`
        # would blame the learner for a partly-right answer.
        outcome_kwargs["verdict"] = "no_verdict"
        outcome_kwargs["tier"] = "B"
        outcome_kwargs.setdefault("reasoning", "partially supported")

    try:
        written = await admit_outcome(
            db,
            user_id=user_id,
            scope_ref=scope_ref,
            outcome=Outcome(**outcome_kwargs),
            provenance=Provenance(
                surface=SURFACE,
                extra={
                    "practiceRef": response_ref,
                    "method": evaluation.method,
                    "feedback": evaluation.feedback,
                    "detail": dict(evaluation.detail),
                    **({"contextHint": surface_hint} if surface_hint else {}),
                },
            ),
        )
    except Exception as exc:  # noqa: BLE001 — the surface must not fail here
        # ⚠️ Deliberately broad. A failed evidence write must never take the
        # learner's own submission down with it: the attempt is already stored,
        # and losing that would lose the only record that it happened.
        return EvidenceResult(outcome=EvidenceOutcome.REJECTED, detail=str(exc)[:400])

    return EvidenceResult(
        outcome=EvidenceOutcome.ADMITTED,
        evidence_id=getattr(written, "id", None),
    )