"""Knowledge-layer REST endpoints.

Three routes, and deliberately no fourth:

  - `GET  /knowledge/structure`  the audit surface: items + edges + derived
    state + provenance (why each conclusion was reached).
  - `GET  /knowledge/brief`      the Learning Brief, fully derived.
  - `POST /knowledge/evidence`   the only write path into Learner State.

**There is no route that sets a state.** Not an oversight and not a TODO: the
absence is the enforcement mechanism for the boundary "the agent writes
evidence, never state". A manual acceptance check goes through the same door as
the agent's tool — see `planning/learner-state-v1-execution-plan.md` §0.3 R1.

No feature flag. The tables ship with the feature (unlike the doc layer, which
had to stay gated while its migration was pending).
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user
from ai.coordinator import (
    EVENT_LEARNER_STATE_UPDATED,
    SOURCE_API,
    CoordinatorEvent,
)
from schemas.knowledge import (
    KnowledgeEvidenceIn,
    KnowledgeEvidenceOut,
    KnowledgeStructureOut,
)
from services import coordinator_service, knowledge_service, project_service

_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="project_not_found"
)

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


async def _require_owned_project(
    db: AsyncSession, user: CurrentUser, project_id: uuid.UUID
) -> None:
    """IDOR rule shared with /pages and /conversations: a foreign or unknown
    project is 404 — indistinguishable from 'does not exist'."""
    project = await project_service.get_owned_project(
        db, user_id=user.id, project_id=project_id
    )
    if project is None:
        raise _NOT_FOUND


@router.get("/structure", response_model=KnowledgeStructureOut)
async def get_structure(
    project_id: uuid.UUID = Query(alias="projectId"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeStructureOut:
    """Everything behind the brief, including the parts the brief hides:
    contradictions against the prerequisite order, items whose conclusion was
    overridden by negative evidence, and evidence that could not be attributed.
    """
    await _require_owned_project(db, current_user, project_id)
    return await knowledge_service.build_structure_out(
        db, project_id=project_id, user_id=current_user.id
    )


@router.get("/brief")
async def get_brief(
    project_id: uuid.UUID = Query(alias="projectId"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """The Learning Brief, computed on read.

    Returned as a plain dict rather than through `response_model` because the
    contract is *not* uniform: six keys are always present (even when null)
    while three evidence-backed sections must be **absent** — not empty — when
    there is nothing behind them, so that thin data reads as a short brief
    rather than an invented one. `LearningBriefOut.to_wire` documents and owns
    that asymmetry; a response_model would strip it back to nulls.
    """
    await _require_owned_project(db, current_user, project_id)
    brief = await knowledge_service.build_brief(
        db, project_id=project_id, user_id=current_user.id
    )
    if brief is None:
        raise _NOT_FOUND
    return brief.to_wire()


@router.post(
    "/evidence",
    response_model=KnowledgeEvidenceOut,
    status_code=status.HTTP_201_CREATED,
)
async def post_evidence(
    payload: KnowledgeEvidenceIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeEvidenceOut:
    """Record one piece of evidence.

    Returns 422 with a machine-readable reason when the evidence is ambiguous
    or malformed, so both a human caller and the agent's tool loop can
    self-correct instead of retrying blindly.

    A successful write also **announces the event to the Coordinator** — in
    process, on this request's own session, in the second half of this function.
    That is the whole invocation mechanism: the two places evidence is written
    are the two places an event exists, and a caller cannot announce one that
    never happened. The decision is recorded in `coordinator_decisions` (and, if
    it is a NOTIFY, delivered through the Notification Sender); its side effects
    never change this response, and a failure inside it cannot fail the write
    that produced it.
    """
    await _require_owned_project(db, current_user, payload.project_id)
    try:
        evidence = await knowledge_service.record_evidence(
            db,
            project_id=payload.project_id,
            user_id=current_user.id,
            payload=payload,
        )
    except knowledge_service.EvidenceRejected as rejected:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"reason": rejected.reason, **rejected.extra},
        ) from rejected

    await coordinator_service.handle_event_safely(
        db,
        user_id=current_user.id,
        event=CoordinatorEvent(
            type=EVENT_LEARNER_STATE_UPDATED,
            # "api": nobody is in a conversation. Evidence written this way comes
            # from a surface with no room to teach in, which is what makes the
            # Coordinator deliver a reminder instead of handing a next step to an
            # agent (see ai/coordinator/rules.py).
            source=SOURCE_API,
            payload={
                "projectId": str(payload.project_id),
                "evidenceId": str(evidence.id),
                "itemId": str(evidence.item_id) if evidence.item_id else None,
                "itemLabel": evidence.item_label,
                "verdict": evidence.verdict,
                "tier": evidence.tier,
            },
        ),
    )
    return evidence
