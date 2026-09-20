"""API contracts for the knowledge layer.

Wire format is camelCase (same convention as `schemas/doc.py`).

One contract deserves to be read before anything else: `LearningBriefOut.to_wire`.
`frontend/src/features/learn-space/brief/types.ts` has carried the Learning Brief
shape since 2026-09-14 with **no numeric field anywhere** — this is the backend
half of that promise, and it is enforced by there being nothing numeric to send.

The brief is **fully derived**. No model call, no cached snapshot, no
`AIUseCase`: every section is a computable quantity of the knowledge structure
(see `ai/knowledge/state.py`). That is why the earlier plan's
`learning_brief_json` cache column and its AI use case are gone — a derived
value cannot drift and cannot be invented.
"""

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

ItemKind = Literal["concept", "skill", "problem_type"]
ItemStatus = Literal["active", "retired"]
EdgeConfidence = Literal["agent_drafted", "user_confirmed"]
Verdict = Literal["correct", "incorrect", "no_verdict"]
EvidenceTier = Literal["A", "B", "C"]
StateValue = Literal["mastered", "not_mastered", "unassessed"]
StateOrigin = Literal["observed", "inferred", "self_reported"]


class _Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class KnowledgeItemOut(_Camel):
    id: uuid.UUID
    project_id: uuid.UUID
    label: str
    kind: ItemKind
    origin: str
    status: ItemStatus
    source_ref: dict[str, Any] | None = None


class KnowledgeEdgeOut(_Camel):
    id: uuid.UUID
    from_item_id: uuid.UUID
    to_item_id: uuid.UUID
    confidence: EdgeConfidence
    counterexample_count: int


class ItemStateOut(_Camel):
    """One item's derived status. A **fact** plus its provenance — no score.

    `evidence_count` is the number of records behind the conclusion, which is
    what "每条结论能说出依据是几条记录" asks for. It is a count, not a metric:
    there is no denominator, so it cannot be read as a percentage.
    """

    item_id: uuid.UUID
    label: str
    value: StateValue
    origin: StateOrigin | None = None
    evidence_count: int = 0
    last_confirmed_at: datetime | None = None


class KnowledgeStructureOut(_Camel):
    """The audit surface: what the structure is and what was derived from it."""

    project_id: uuid.UUID
    items: list[KnowledgeItemOut]
    edges: list[KnowledgeEdgeOut]
    states: list[ItemStateOut]
    outer_fringe: list[uuid.UUID]
    inner_fringe: list[uuid.UUID]
    violations: list[tuple[uuid.UUID, uuid.UUID]]
    overridden_ids: list[uuid.UUID]
    ignored_evidence: int


class KnowledgeEvidenceIn(_Camel):
    """One piece of evidence. The only write path into Learner State."""

    project_id: uuid.UUID
    # Either identify the item directly, or name it and let the service resolve
    # it inside the space (the agent talks in labels, not uuids).
    item_id: uuid.UUID | None = None
    item_label: str | None = None
    verdict: Verdict
    tier: EvidenceTier = "A"
    independent: bool = True
    hint_used: bool = False
    # Mandatory for tier B: an unreviewable rubric call is not evidence.
    reasoning: str | None = None
    response_ref: dict[str, Any] | None = None


class KnowledgeEvidenceOut(_Camel):
    id: uuid.UUID
    project_id: uuid.UUID
    item_id: uuid.UUID | None = None
    item_label: str | None = None
    verdict: Verdict
    tier: EvidenceTier
    independent: bool
    hint_used: bool
    reasoning: str | None = None
    created_at: datetime


class KnowledgeImportIn(_Camel):
    """The Phase-0 draft, as data. Produced by a human-reviewed LLM draft."""

    class DraftItem(_Camel):
        ref: str
        label: str
        kind: ItemKind = "concept"
        source: dict[str, Any] | None = None
        origin: str = "agent_drafted"

    class DraftEdge(_Camel):
        from_ref: str = Field(alias="from")
        to_ref: str = Field(alias="to")
        confidence: EdgeConfidence = "agent_drafted"
        why: str | None = None

    items: list[DraftItem]
    edges: list[DraftEdge] = Field(default_factory=list)


class KnowledgeImportOut(_Camel):
    project_id: uuid.UUID
    items_created: int
    items_reused: int
    edges_created: int
    edges_skipped: int


class LearningBriefNextStep(_Camel):
    """One step of "接下来". Always derivable, never invented.

    `reason` is a fact about the prerequisite order, not a score: it names why
    this item is reachable now, and how many records stand behind it.
    `href` is deliberately never filled in Phase 1 — steps open a conversation
    in the space (`prompt`) instead of depending on a course lesson link.
    """

    id: uuid.UUID
    title: str
    reason: str | None = None
    href: str | None = None
    prompt: str | None = None


class LearningBriefOut(_Camel):
    """The Learning Brief. Every field here is computed, none is generated.

    Mapping (see plan §3 B5): `alreadyHave` = the state, `developing` = the
    inner fringe ("just learned, not settled"), `nextSteps` = the outer fringe,
    `doing` = items with recent evidence. Three sections are omitted entirely
    when empty, on purpose: the panel's rule is "no evidence -> whole section
    hidden", so thin data must read as a *short* brief, not an invented one.
    """

    project_id: uuid.UUID
    space_name: str
    goal: str | None = None
    is_goal_inferred: bool = False
    doing: list[str] | None = None
    already_have: list[str] | None = None
    developing: list[str] | None = None
    main_obstacle: str | None = None
    next_steps: list[LearningBriefNextStep] = Field(default_factory=list)
    generated_at: datetime | None = None

    def to_wire(self) -> dict[str, Any]:
        """Exactly what `brief/types.ts` expects. Written out longhand rather
        than via `exclude_none` because the keys are not uniformly optional:

          * always present — `projectId`, `spaceName`, `goal`, `isGoalInferred`,
            `nextSteps`, `generatedAt` (`nextSteps` must be an array so the
            panel can map over it; `goal` must be present even when null);
          * present only when non-empty — `doing`, `alreadyHave`, `developing`,
            `mainObstacle`.
        """
        wire: dict[str, Any] = {
            "projectId": str(self.project_id),
            "spaceName": self.space_name,
            "goal": self.goal,
            "isGoalInferred": self.is_goal_inferred,
            "nextSteps": [
                {
                    "id": str(step.id),
                    "title": step.title,
                    **({"reason": step.reason} if step.reason else {}),
                    **({"href": step.href} if step.href else {}),
                    **({"prompt": step.prompt} if step.prompt else {}),
                }
                for step in self.next_steps
            ],
            "generatedAt": self.generated_at.isoformat() if self.generated_at else None,
        }
        for key, value in (
            ("doing", self.doing),
            ("alreadyHave", self.already_have),
            ("developing", self.developing),
            ("mainObstacle", self.main_obstacle),
        ):
            if value:
                wire[key] = value
        return wire
