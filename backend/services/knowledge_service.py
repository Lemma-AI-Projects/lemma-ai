"""Knowledge-layer persistence and brief assembly.

This module is the **only** place that reads or writes the three knowledge
tables, and it is layered strictly on top of `ai/knowledge/state`:

    DB rows  ->  domain records  ->  derive_state()  ->  derived views

Two rules hold everywhere in here:

1. **Nothing writes a state.** There is no `set_mastery`, no `mark_learned`,
   no status column to update. The state is recomputed on every read from
   (items, edges, evidence). That is why `04`'s "don't store it" survives
   unchanged even though D12 added three tables.
2. **Visible output carries no numbers except counts.** `build_brief` emits
   labels and reasons; the record count goes into a sentence, never into a
   field that could be read as a score.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.knowledge import (
    Edge,
    Evidence,
    Fringes,
    Item,
    KnowledgeState,
    StateValue,
    Tier,
    Verdict,
    compute_fringes,
    derive_state,
    summarize,
)
from models import (
    KnowledgeEdge,
    KnowledgeEvidence,
    KnowledgeItem,
    Project,
)
from models.knowledge import EDGE_CONFIDENCES
from schemas.knowledge import (
    ItemStateOut,
    KnowledgeEdgeOut,
    KnowledgeEvidenceIn,
    KnowledgeEvidenceOut,
    KnowledgeImportIn,
    KnowledgeImportOut,
    KnowledgeItemOut,
    KnowledgeStructureOut,
    LearningBriefNextStep,
    LearningBriefOut,
)

# "What you are working on" is a recency window, not an accumulated list.
DOING_WINDOW = timedelta(days=7)
# The Learning Brief panel has no cap of its own (see planning/PENDING.md F8),
# so the backend owns the ceiling for every list it emits.
BRIEF_LIST_CAP = 8
BRIEF_NEXT_STEP_CAP = 5


class EvidenceRejected(Exception):
    """Evidence that must not be written. Carries enough for a caller to
    self-correct inside a tool loop (the agent) or surface a 4xx (the API)."""

    def __init__(self, reason: str, **extra: object) -> None:
        super().__init__(reason)
        self.reason = reason
        self.extra = extra


# --- reads -------------------------------------------------------------------


async def list_items(
    db: AsyncSession, *, project_id: uuid.UUID
) -> list[KnowledgeItem]:
    result = await db.execute(
        select(KnowledgeItem)
        .where(KnowledgeItem.project_id == project_id)
        .order_by(KnowledgeItem.created_at, KnowledgeItem.label)
    )
    return list(result.scalars().all())


async def list_edges(
    db: AsyncSession, *, project_id: uuid.UUID
) -> list[KnowledgeEdge]:
    result = await db.execute(
        select(KnowledgeEdge)
        .where(KnowledgeEdge.project_id == project_id)
        .order_by(KnowledgeEdge.created_at)
    )
    return list(result.scalars().all())


async def list_evidence(
    db: AsyncSession, *, project_id: uuid.UUID, user_id: uuid.UUID
) -> list[KnowledgeEvidence]:
    """All evidence, oldest first. Kept whole on purpose: state is derived, so
    truncating the input here would silently change a conclusion."""
    result = await db.execute(
        select(KnowledgeEvidence)
        .where(
            KnowledgeEvidence.project_id == project_id,
            KnowledgeEvidence.user_id == user_id,
        )
        .order_by(KnowledgeEvidence.created_at)
    )
    return list(result.scalars().all())


def to_domain(
    items: list[KnowledgeItem],
    edges: list[KnowledgeEdge],
    evidence: list[KnowledgeEvidence],
) -> tuple[list[Item], list[Edge], list[Evidence]]:
    """ORM rows -> the pure records `ai/knowledge/state` works on.

    Public because "rows -> domain records" is a translation, not an internal
    detail: anything that needs to run the derivation over a *subset* of the
    evidence (the Coordinator recomputes the value an item had before the newest
    record) must not re-implement it and drift.
    """
    domain_items = [
        Item(id=str(row.id), label=row.label, active=row.status == "active")
        for row in items
    ]
    domain_edges = [
        Edge(prerequisite_id=str(row.from_item_id), dependent_id=str(row.to_item_id))
        for row in edges
    ]
    domain_evidence = [
        Evidence(
            item_id=str(row.item_id),
            verdict=Verdict(row.verdict),
            tier=Tier(row.tier),
            independent=row.independent,
            hint_used=row.hint_used,
            reasoning=row.reasoning,
            created_at=row.created_at,
        )
        for row in evidence
        if row.item_id is not None
    ]
    return domain_items, domain_edges, domain_evidence


async def compute_state(
    db: AsyncSession, *, project_id: uuid.UUID, user_id: uuid.UUID
) -> tuple[KnowledgeState, Fringes, list[KnowledgeItem], list[KnowledgeEdge]]:
    """The one derivation path. Every consumer goes through here."""
    items = await list_items(db, project_id=project_id)
    edges = await list_edges(db, project_id=project_id)
    evidence = await list_evidence(db, project_id=project_id, user_id=user_id)
    domain_items, domain_edges, domain_evidence = to_domain(items, edges, evidence)
    state = derive_state(domain_items, domain_edges, domain_evidence)
    fringes = compute_fringes(state, domain_items, domain_edges)
    return state, fringes, items, edges


async def build_structure_out(
    db: AsyncSession, *, project_id: uuid.UUID, user_id: uuid.UUID
) -> KnowledgeStructureOut:
    """The audit surface: structure + derived state + provenance."""
    state, fringes, items, edges = await compute_state(
        db, project_id=project_id, user_id=user_id
    )
    labels = {str(row.id): row.label for row in items}
    states = [
        ItemStateOut(
            item_id=uuid.UUID(item_id),
            label=labels.get(item_id, item_id),
            value=status.value,
            origin=status.origin.value if status.origin else None,
            evidence_count=status.evidence_count,
            last_confirmed_at=status.last_confirmed_at,
        )
        for item_id, status in state.statuses.items()
    ]
    return KnowledgeStructureOut(
        project_id=project_id,
        items=[
            KnowledgeItemOut(
                id=row.id,
                project_id=row.project_id,
                label=row.label,
                kind=row.kind,
                origin=row.origin,
                status=row.status,
                source_ref=row.source_ref,
            )
            for row in items
        ],
        edges=[
            KnowledgeEdgeOut(
                id=row.id,
                from_item_id=row.from_item_id,
                to_item_id=row.to_item_id,
                confidence=row.confidence,
                counterexample_count=row.counterexample_count,
            )
            for row in edges
        ],
        states=states,
        outer_fringe=[uuid.UUID(i) for i in fringes.outer],
        inner_fringe=[uuid.UUID(i) for i in fringes.inner],
        violations=[
            (uuid.UUID(e.prerequisite_id), uuid.UUID(e.dependent_id))
            for e in state.violations
        ],
        overridden_ids=[uuid.UUID(i) for i in state.overridden_ids],
        ignored_evidence=state.ignored_evidence,
    )


async def summarize_for_prompt(
    db: AsyncSession, *, project_id: uuid.UUID, user_id: uuid.UUID
) -> str:
    """The Learner State block injected into the conversation prompt.

    Returns the honest empty line rather than raising when the space has no
    structure yet, so a prompt template never grows a branch.
    """
    block, _ = await state_for_prompt(db, project_id=project_id, user_id=user_id)
    return block


async def state_for_prompt(
    db: AsyncSession, *, project_id: uuid.UUID, user_id: uuid.UUID
) -> tuple[str, list[str]]:
    """(prompt block, outer-fringe labels) — derived once, for the turn assembly.

    Two consumers, one derivation: the block goes into the prompt, the labels go
    into the answer's digest, so the panel can show what the agent was told was
    next. Derived here once because the turn needs both — asking twice would
    re-run the whole derivation (items + edges + evidence) for the same turn.

    The labels come back as text on purpose: the digest must not carry a mastery
    number, and it does not need to — the titles of what is ready to learn ARE
    the fact.
    """
    state, fringes, items, _ = await compute_state(
        db, project_id=project_id, user_id=user_id
    )
    domain_items = [
        Item(id=str(row.id), label=row.label, active=row.status == "active")
        for row in items
    ]
    labels = {str(row.id): row.label for row in items}
    return (
        summarize(state, fringes, domain_items),
        [labels.get(i, i) for i in fringes.outer],
    )


# --- brief -------------------------------------------------------------------


def _reason_for_step(status, evidence_count: int) -> str:
    """Why this item is on the list — a fact about the prerequisite order.

    Never a score: it either states that every prerequisite is already held, or
    counts the records standing behind the item. Both are checkable.
    """
    if evidence_count == 0:
        return "它的前提你都具备了，还没有测过"
    return f"它的前提你都具备了（已有 {evidence_count} 条记录）"


def _main_obstacle(state: KnowledgeState, labels: dict[str, str], edges) -> str | None:
    """The single biggest blocker, or None.

    Defined as the not-yet-mastered item that the most other items depend on
    directly. Returns None when nothing qualifies, because the panel hides an
    absent obstacle and a wrong one is worse than none.
    """
    dependents: dict[str, int] = {}
    for edge in edges:
        dependents[edge.prerequisite_id] = dependents.get(edge.prerequisite_id, 0) + 1
    candidates = [
        (item_id, count)
        for item_id, count in dependents.items()
        if state.value(item_id) is StateValue.NOT_MASTERED
    ]
    if not candidates:
        return None
    # Deterministic: highest dependent count, ties broken by label.
    item_id, count = max(candidates, key=lambda pair: (pair[1], labels.get(pair[0], "")))
    return f"「{labels.get(item_id, item_id)}」还没过 —— 接下来有 {count} 项卡在它后面"


async def build_brief(
    db: AsyncSession, *, project_id: uuid.UUID, user_id: uuid.UUID
) -> LearningBriefOut | None:
    """The Learning Brief. Fully derived; no model call anywhere.

    Returns None when the project is not owned (the route turns that into 404).
    `goal` is always None right now: there is no write surface for it anywhere
    in the repo, and inventing one here would be a different feature.
    """
    project = (
        await db.execute(select(Project).where(Project.id == project_id))
    ).scalar_one_or_none()
    if project is None or project.user_id != user_id:
        return None

    state, fringes, items, edges = await compute_state(
        db, project_id=project_id, user_id=user_id
    )
    labels = {str(row.id): row.label for row in items}

    already_have = [labels.get(i, i) for i in state.mastered_ids][:BRIEF_LIST_CAP]
    developing = [labels.get(i, i) for i in fringes.inner][:BRIEF_LIST_CAP]

    next_steps: list[LearningBriefNextStep] = []
    for item_id in fringes.outer[:BRIEF_NEXT_STEP_CAP]:
        status = state.statuses.get(item_id)
        label = labels.get(item_id, item_id)
        next_steps.append(
            LearningBriefNextStep(
                id=uuid.UUID(item_id),
                title=label,
                reason=_reason_for_step(status, status.evidence_count if status else 0),
                # No href in Phase 1: a step opens a conversation in this space
                # rather than depending on a course lesson link.
                prompt=f"讲讲「{label}」",
            )
        )

    recent_cutoff = datetime.now(UTC) - DOING_WINDOW
    domain_edges = [
        Edge(prerequisite_id=str(e.from_item_id), dependent_id=str(e.to_item_id))
        for e in edges
    ]
    evidence = await list_evidence(db, project_id=project_id, user_id=user_id)
    doing: list[str] = []
    for row in reversed(evidence):  # most recent first
        if row.item_id is None or row.created_at < recent_cutoff:
            continue
        label = labels.get(str(row.item_id))
        if label and label not in doing:
            doing.append(label)
        if len(doing) >= BRIEF_LIST_CAP:
            break

    return LearningBriefOut(
        project_id=project_id,
        space_name=project.name,
        goal=None,
        is_goal_inferred=False,
        doing=doing or None,
        already_have=already_have or None,
        developing=developing or None,
        main_obstacle=_main_obstacle(state, labels, domain_edges),
        next_steps=next_steps,
        generated_at=datetime.now(UTC),
    )


# --- structure writes --------------------------------------------------------


def _would_cycle(
    edges: list[KnowledgeEdge], from_item_id: uuid.UUID, to_item_id: uuid.UUID
) -> bool:
    """Adding from->to closes a cycle iff `from` is already reachable from `to`.

    A cycle would destroy the definition of a feasible state as a lower set,
    and with it the whole derivation — so this is a hard refusal, not a warning.
    """
    if from_item_id == to_item_id:
        return True
    adjacency: dict[uuid.UUID, set[uuid.UUID]] = {}
    for edge in edges:
        adjacency.setdefault(edge.from_item_id, set()).add(edge.to_item_id)
    stack = [to_item_id]
    seen: set[uuid.UUID] = set()
    while stack:
        node = stack.pop()
        if node == from_item_id:
            return True
        if node in seen:
            continue
        seen.add(node)
        stack.extend(adjacency.get(node, ()))
    return False


async def import_structure(
    db: AsyncSession, *, project_id: uuid.UUID, payload: KnowledgeImportIn
) -> KnowledgeImportOut:
    """Land a reviewed draft. Idempotent by label within the space.

    Edges that would create a cycle are skipped and counted rather than
    aborting the import: a draft with one bad edge should still be usable.
    """
    existing = await list_items(db, project_id=project_id)
    by_label = {row.label.strip(): row for row in existing}

    created = 0
    reused = 0
    by_ref: dict[str, KnowledgeItem] = {}
    for draft in payload.items:
        label = draft.label.strip()
        if not label:
            continue
        row = by_label.get(label)
        if row is None:
            row = KnowledgeItem(
                project_id=project_id,
                label=label,
                kind=draft.kind,
                source_ref=draft.source,
                origin=draft.origin,
            )
            db.add(row)
            await db.flush()
            by_label[label] = row
            created += 1
        else:
            reused += 1
        by_ref[draft.ref] = row

    edges = await list_edges(db, project_id=project_id)
    edges_created = 0
    edges_skipped = 0
    for draft in payload.edges:
        source = by_ref.get(draft.from_ref)
        target = by_ref.get(draft.to_ref)
        if source is None or target is None or source.id == target.id:
            edges_skipped += 1
            continue
        if any(
            e.from_item_id == source.id and e.to_item_id == target.id for e in edges
        ):
            edges_skipped += 1
            continue
        if _would_cycle(edges, source.id, target.id):
            edges_skipped += 1
            continue
        edge = KnowledgeEdge(
            project_id=project_id,
            from_item_id=source.id,
            to_item_id=target.id,
            confidence=draft.confidence,
        )
        db.add(edge)
        edges.append(edge)
        edges_created += 1

    await db.commit()
    return KnowledgeImportOut(
        project_id=project_id,
        items_created=created,
        items_reused=reused,
        edges_created=edges_created,
        edges_skipped=edges_skipped,
    )


async def add_edge(
    db: AsyncSession,
    *,
    project_id: uuid.UUID,
    from_item_id: uuid.UUID,
    to_item_id: uuid.UUID,
    confidence: str = "agent_drafted",
) -> KnowledgeEdge:
    if confidence not in EDGE_CONFIDENCES:
        raise EvidenceRejected("bad_confidence", allowed=list(EDGE_CONFIDENCES))
    edges = await list_edges(db, project_id=project_id)
    if _would_cycle(edges, from_item_id, to_item_id):
        raise EvidenceRejected("would_create_cycle")
    edge = KnowledgeEdge(
        project_id=project_id,
        from_item_id=from_item_id,
        to_item_id=to_item_id,
        confidence=confidence,
    )
    db.add(edge)
    await db.commit()
    await db.refresh(edge)
    return edge


async def remove_edge(
    db: AsyncSession, *, project_id: uuid.UUID, edge_id: uuid.UUID
) -> bool:
    result = await db.execute(
        delete(KnowledgeEdge).where(
            KnowledgeEdge.id == edge_id, KnowledgeEdge.project_id == project_id
        )
    )
    await db.commit()
    return bool(result.rowcount)


# --- evidence writes (the only door into Learner State) ----------------------


async def resolve_item(
    db: AsyncSession,
    *,
    project_id: uuid.UUID,
    item_id: uuid.UUID | None = None,
    item_label: str | None = None,
) -> tuple[KnowledgeItem | None, list[str]]:
    """Find the item a piece of evidence is about.

    Exact label match first; then a unique case-insensitive containment match.
    Ambiguity is a refusal, never a guess — a wrong attribution corrupts the
    state and is invisible afterwards. Returns (item, candidate labels).
    """
    items = await list_items(db, project_id=project_id)
    if item_id is not None:
        return next((row for row in items if row.id == item_id), None), []
    needle = (item_label or "").strip()
    if not needle:
        return None, []
    folded = needle.casefold()
    exact = [row for row in items if row.label.strip().casefold() == folded]
    if len(exact) == 1:
        return exact[0], []
    if len(exact) > 1:
        return None, [row.label for row in exact]
    partial = [
        row
        for row in items
        if folded in row.label.casefold() or row.label.casefold() in folded
    ]
    if len(partial) == 1:
        return partial[0], []
    return None, [row.label for row in partial]


async def record_evidence(
    db: AsyncSession,
    *,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: KnowledgeEvidenceIn,
) -> KnowledgeEvidenceOut:
    """Write one piece of evidence. Append-only; nothing here changes state.

    This is the function the Global Agent's tool calls, and the one the manual
    acceptance check calls. Same door, so the acceptance test cannot take a
    shortcut that production does not have.
    """
    if payload.tier == "B" and not (payload.reasoning or "").strip():
        # A rubric judgement with no recorded reason cannot be reviewed later,
        # and an unreviewable judgement is not evidence.
        raise EvidenceRejected("reasoning_required_for_tier_b")

    item, candidates = await resolve_item(
        db,
        project_id=project_id,
        item_id=payload.item_id,
        item_label=payload.item_label,
    )
    if item is None:
        if candidates:
            raise EvidenceRejected("ambiguous_item", candidates=candidates)
        if payload.item_id is not None:
            raise EvidenceRejected("unknown_item")
        # A named-but-unknown topic is not an error: it becomes the topic's
        # origin (that is why knowledge_evidence.item_id is nullable).
        item = KnowledgeItem(
            project_id=project_id,
            label=(payload.item_label or "").strip(),
            kind="concept",
            origin="agent_drafted",
        )
        db.add(item)
        await db.flush()

    row = KnowledgeEvidence(
        project_id=project_id,
        user_id=user_id,
        item_id=item.id,
        verdict=payload.verdict,
        tier=payload.tier,
        independent=payload.independent,
        hint_used=payload.hint_used,
        reasoning=payload.reasoning,
        response_ref=payload.response_ref,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return KnowledgeEvidenceOut(
        id=row.id,
        project_id=row.project_id,
        item_id=row.item_id,
        item_label=item.label,
        verdict=row.verdict,
        tier=row.tier,
        independent=row.independent,
        hint_used=row.hint_used,
        reasoning=row.reasoning,
        created_at=row.created_at,
    )


async def count_evidence(
    db: AsyncSession, *, project_id: uuid.UUID, user_id: uuid.UUID
) -> int:
    result = await db.execute(
        select(func.count(KnowledgeEvidence.id)).where(
            KnowledgeEvidence.project_id == project_id,
            KnowledgeEvidence.user_id == user_id,
        )
    )
    return int(result.scalar_one() or 0)
