"""Knowledge-state derivation — two closure rules, no probabilities.

## What this computes

A *knowledge structure* is a pair `(Q, K)`: a finite set of granular topics
`Q` (a "knowledge item" is a topic, **not a question** — a question, an
explanation or a whiteboard proof is an *instance* of one), and the family
`K` of *feasible* subsets of `Q`, called knowledge states.

KST's full machinery derives the state from a posterior distribution over
`K`, which ALEKS must do over ~10^23 states. **We do not need that.** When the
structure is represented as a prerequisite partial order — as ALEKS itself
does internally — the feasible states are exactly its *lower sets*:

    S feasible  <=>  for every edge (x -> y):  y in S  implies  x in S
                     ("if you can do the dependent, you can do the prerequisite")

so the state has a closed form, and inference over unprobed items becomes two
deterministic rules:

    downward closure   y in S  and  x -> y   =>   x in S
    upward contrapositive  x not in S and x -> y  =>  y not in S

Both are O(E) sweeps to a fixed point. **Zero parameters, zero training, zero
model calls — while still inferring knowledge of items that were never
tested**, which is the single most valuable thing KST gives a product.

## The two departures from textbook KST

1. **A third value.** KST assumes every item of `Q` is eventually assessed.
   Lemma's spaces are never fully assessed, so an item is `unassessed` until
   evidence or structure says otherwise. Collapsing that to "not known" would
   accuse the learner; collapsing it to "known" would fabricate.

2. **Negative evidence wins.** ALEKS guarantees its returned set is a valid
   state by treating off-order response patterns as noise. We keep that
   guarantee, but resolve a direct contradiction (a prerequisite observed as
   *not* mastered while its dependent is observed as mastered) by taking the
   negative — the conservative reading — and recording the edge as a
   `violation` so the structure itself can be questioned later.

## What is deliberately NOT here

No BLIM slip/guess parameter fitting, no fuzzy membership degrees, no
forgetting curve, no learned model. Those need calibration data Lemma does
not have; without it a "computed" probability is just a fabricated number
moved from the UI into the code. Record *counts* and *facts* instead.

## Evidence admissibility (the whole of the reliability story)

A "correct" verdict is weak evidence — guessing is cheap and Lemma has no
controlled item bank. So a correct answer counts **only** when the learner
produced it themselves (`independent`) without a hint, and when the verdict
came from a deterministic checker (tier A). Tier B (rubric-judged) is allowed
but needs two independent records. Tier C (behaviour only — watched a video,
uploaded a file) never moves the state.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum

# Tier-B evidence needs this many admissible records before it counts.
# Same shape as the prototype's misconception-confirmation threshold.
B_LEVEL_MIN_EVIDENCE = 2


class Tier(StrEnum):
    """How verifiable the verdict is."""

    A = "A"  # deterministic checker (multiple choice, numeric, solver, ...)
    B = "B"  # rubric-judged (LLM + rubric, reason recorded)
    C = "C"  # behaviour only — never moves the state


class Verdict(StrEnum):
    CORRECT = "correct"
    INCORRECT = "incorrect"
    NO_VERDICT = "no_verdict"


class StateValue(StrEnum):
    MASTERED = "mastered"
    NOT_MASTERED = "not_mastered"
    UNASSESSED = "unassessed"


class Origin(StrEnum):
    """Where a value came from. The audit trail behind every conclusion."""

    OBSERVED = "observed"  # a direct piece of admissible evidence
    INFERRED = "inferred"  # propagated along the prerequisite order
    # Reserved for the self-report channel (a learner stating their level).
    # Not produced by derivation: a self-report is not evidence and must not
    # propagate. Wire contract only.
    SELF_REPORTED = "self_reported"


@dataclass(frozen=True)
class Item:
    """One granular topic. Not a question — a question is an instance of it."""

    id: str
    label: str = ""
    active: bool = True


@dataclass(frozen=True)
class Edge:
    """`prerequisite_id` must be known before `dependent_id` can be.

    Read as: "being able to do `dependent` implies being able to do
    `prerequisite`". The graph must be acyclic.
    """

    prerequisite_id: str
    dependent_id: str


@dataclass(frozen=True)
class Evidence:
    item_id: str
    verdict: Verdict
    tier: Tier = Tier.A
    independent: bool = True
    hint_used: bool = False
    reasoning: str | None = None
    created_at: datetime | None = None


@dataclass
class ItemStatus:
    value: StateValue
    origin: Origin | None
    evidence_count: int = 0
    last_confirmed_at: datetime | None = None

    @property
    def is_assessed(self) -> bool:
        return self.value is not StateValue.UNASSESSED


@dataclass
class KnowledgeState:
    """The derived state. Never stored — always recomputed from its inputs.

    Fringes deliberately live in `Fringes`, not here: one home per fact.
    """

    statuses: dict[str, ItemStatus]
    # Edges contradicted by direct evidence: the dependent is directly
    # observed as mastered while its prerequisite did not end up mastered.
    # These feed structure revision (a counterexample count per edge), they
    # do not change the state.
    violations: list[Edge] = field(default_factory=list)
    # Items that were directly observed as mastered but were pulled back to
    # not_mastered by the negative-wins rule. Surfaced, never hidden.
    overridden_ids: list[str] = field(default_factory=list)
    # Evidence that named an unknown or retired item. Diagnostic only.
    ignored_evidence: int = 0

    def value(self, item_id: str) -> StateValue:
        status = self.statuses.get(item_id)
        return status.value if status else StateValue.UNASSESSED

    def ids_with(self, value: StateValue) -> list[str]:
        return [i for i, s in self.statuses.items() if s.value is value]

    @property
    def mastered_ids(self) -> list[str]:
        return self.ids_with(StateValue.MASTERED)

    @property
    def not_mastered_ids(self) -> list[str]:
        return self.ids_with(StateValue.NOT_MASTERED)

    @property
    def unassessed_ids(self) -> list[str]:
        return self.ids_with(StateValue.UNASSESSED)

    def is_lower_set(self, edges: Iterable[Edge]) -> bool:
        """The invariant: nothing is mastered without its prerequisites.

        Exposed as a method so tests (and any future caller) can assert it
        directly rather than re-deriving it.
        """
        mastered = set(self.mastered_ids)
        return all(
            e.prerequisite_id in mastered
            for e in edges
            if e.dependent_id in mastered
        )


@dataclass
class Fringes:
    """The two edge sets that, together, determine the state (Falmagne &
    Doignon 2011, Thm 4.1.7) — which is why the brief needs no extra fields."""

    outer: list[str]  # ready to learn: every prerequisite is already held
    inner: list[str]  # just learned, nothing rests on it yet -> not settled


def is_evidence_admissible(evidence: Evidence) -> bool:
    """Tier-level filter. The tier-B count threshold is applied per item."""
    if evidence.tier is Tier.C:
        return False
    if evidence.verdict is Verdict.NO_VERDICT:
        return False
    if evidence.verdict is Verdict.CORRECT:
        # A correct answer is the weak direction: it only counts when the
        # learner produced it themselves, unaided.
        return evidence.independent and not evidence.hint_used
    return True


def _direct_assignments(
    items: Sequence[Item],
    evidence: Sequence[Evidence],
) -> tuple[dict[str, StateValue], dict[str, ItemStatus], int]:
    """Filter evidence and fold it into one value per item.

    Returns (direct values, per-item bookkeeping, count of ignored evidence).
    """
    known = {item.id for item in items if item.active}
    admissible = [e for e in evidence if is_evidence_admissible(e)]
    ignored = len(evidence) - len(admissible)
    ignored += sum(1 for e in admissible if e.item_id not in known)
    admissible = [e for e in admissible if e.item_id in known]

    by_item: dict[str, list[Evidence]] = {}
    for ev in admissible:
        by_item.setdefault(ev.item_id, []).append(ev)

    direct: dict[str, StateValue] = {}
    bookkeeping: dict[str, ItemStatus] = {}
    for item_id, rows in by_item.items():
        # Tier B is rubric-judged, so a single record is not enough: one
        # mis-scored free response must not move the state.
        deterministic = [r for r in rows if r.tier is not Tier.B]
        rubric = [r for r in rows if r.tier is Tier.B]
        counting = deterministic + (
            rubric if len(rubric) >= B_LEVEL_MIN_EVIDENCE else []
        )
        if not counting:
            continue

        # Set-based, not order-based: the result must not depend on how the
        # evidence happened to be ordered. Conflicting records resolve to the
        # conservative reading (a failed re-check pulls the item back), which
        # is also what a periodic knowledge check does in ALEKS.
        verdicts = {r.verdict for r in counting}
        if Verdict.CORRECT in verdicts and Verdict.INCORRECT in verdicts:
            value = StateValue.NOT_MASTERED
        elif Verdict.CORRECT in verdicts:
            value = StateValue.MASTERED
        else:
            value = StateValue.NOT_MASTERED

        stamps = [r.created_at for r in counting if r.created_at is not None]
        direct[item_id] = value
        bookkeeping[item_id] = ItemStatus(
            value=value,
            origin=Origin.OBSERVED,
            evidence_count=len(counting),
            last_confirmed_at=max(stamps) if stamps else None,
        )
    return direct, bookkeeping, ignored


def _upward_negative_closure(
    direct: Mapping[str, StateValue], edges: Sequence[Edge]
) -> set[str]:
    """If a prerequisite is not mastered, nothing above it can be. Wins over
    positive evidence — this is what keeps the state a valid lower set."""
    negative = {i for i, v in direct.items() if v is StateValue.NOT_MASTERED}
    changed = True
    while changed:
        changed = False
        for edge in edges:
            if edge.prerequisite_id in negative and edge.dependent_id not in negative:
                negative.add(edge.dependent_id)
                changed = True
    return negative


def _downward_positive_closure(
    direct: Mapping[str, StateValue],
    edges: Sequence[Edge],
    excluded: set[str],
) -> set[str]:
    """If a dependent is mastered, everything under it is too."""
    positive = {
        i for i, v in direct.items() if v is StateValue.MASTERED and i not in excluded
    }
    changed = True
    while changed:
        changed = False
        for edge in edges:
            if edge.dependent_id in positive and edge.prerequisite_id not in positive:
                positive.add(edge.prerequisite_id)
                changed = True
    return positive


def derive_state(
    items: Sequence[Item],
    edges: Sequence[Edge],
    evidence: Sequence[Evidence],
) -> KnowledgeState:
    """The instrument. Pure, deterministic, no I/O.

    Same inputs always produce the same state — which is the property a
    language model cannot offer, and the reason state lives here.
    """
    active = [item for item in items if item.active]
    active_ids = {item.id for item in active}
    # Only edges whose endpoints are both active can constrain the state.
    live_edges = [
        e for e in edges if e.prerequisite_id in active_ids and e.dependent_id in active_ids
    ]

    direct, bookkeeping, ignored = _direct_assignments(items, evidence)

    negative = _upward_negative_closure(direct, live_edges)
    positive = _downward_positive_closure(direct, live_edges, excluded=negative)

    statuses: dict[str, ItemStatus] = {}
    for item in active:
        book = bookkeeping.get(item.id)
        if item.id in negative:
            observed = direct.get(item.id) is StateValue.NOT_MASTERED
            statuses[item.id] = ItemStatus(
                value=StateValue.NOT_MASTERED,
                origin=Origin.OBSERVED if observed else Origin.INFERRED,
                evidence_count=book.evidence_count if book else 0,
                last_confirmed_at=book.last_confirmed_at if book else None,
            )
        elif item.id in positive:
            observed = direct.get(item.id) is StateValue.MASTERED
            statuses[item.id] = ItemStatus(
                value=StateValue.MASTERED,
                origin=Origin.OBSERVED if observed else Origin.INFERRED,
                evidence_count=book.evidence_count if book else 0,
                last_confirmed_at=book.last_confirmed_at if book else None,
            )
        else:
            statuses[item.id] = ItemStatus(
                value=StateValue.UNASSESSED, origin=None
            )

    violations = [
        e
        for e in live_edges
        if direct.get(e.dependent_id) is StateValue.MASTERED
        and e.prerequisite_id not in positive
    ]
    overridden = [
        i
        for i, v in direct.items()
        if v is StateValue.MASTERED and i in negative
    ]

    return KnowledgeState(
        statuses=statuses,
        violations=violations,
        overridden_ids=overridden,
        ignored_evidence=ignored,
    )


def compute_fringes(
    state: KnowledgeState,
    items: Sequence[Item],
    edges: Sequence[Edge],
) -> Fringes:
    """Outer fringe = ready to learn; inner fringe = just learned, not settled.

    Both are one scan of the edge set. In a prerequisite order the outer
    fringe is exactly the minimal items outside the state, and the inner
    fringe exactly the maximal items inside it.
    """
    active = [item for item in items if item.active]
    active_ids = {item.id for item in active}
    live_edges = [
        e for e in edges if e.prerequisite_id in active_ids and e.dependent_id in active_ids
    ]
    prerequisites: dict[str, set[str]] = {}
    dependents: dict[str, set[str]] = {}
    for edge in live_edges:
        prerequisites.setdefault(edge.dependent_id, set()).add(edge.prerequisite_id)
        dependents.setdefault(edge.prerequisite_id, set()).add(edge.dependent_id)

    mastered = set(state.mastered_ids)
    outer: list[str] = []
    inner: list[str] = []
    for item in active:
        if item.id in mastered:
            if not (dependents.get(item.id, set()) & mastered):
                inner.append(item.id)
        elif prerequisites.get(item.id, set()) <= mastered:
            outer.append(item.id)
    return Fringes(outer=outer, inner=inner)


def summarize(
    state: KnowledgeState,
    fringes: Fringes,
    items: Sequence[Item],
    *,
    max_per_section: int = 8,
) -> str:
    """Render the state for a prompt. Facts only — no scores, no percentages.

    The discipline paragraph is part of the output on purpose: the prompt is
    where a model is most likely to start improvising about a learner, and
    the fix is to tell it what it is *not* allowed to infer.
    """
    labels = {item.id: (item.label or item.id) for item in items if item.active}

    def render(ids: Sequence[str]) -> list[str]:
        shown = list(ids)[:max_per_section]
        lines = [f"- {labels.get(i, i)}" for i in shown]
        if len(ids) > len(shown):
            lines.append(f"- …（另有 {len(ids) - len(shown)} 项）")
        return lines

    if not labels:
        return "（这个空间还没有知识结构，无法给出学习状态。）"

    sections: list[tuple[str, Sequence[str]]] = [
        ("已经具备", state.mastered_ids),
        ("正在形成（刚学会、还不牢）", fringes.inner),
        ("还没测过", state.unassessed_ids),
        ("接下来可学（前提都已具备）", fringes.outer),
    ]
    lines: list[str] = [
        "## 学习状态（由系统根据证据算出，请以此为准）",
        "",
    ]
    any_content = False
    for title, ids in sections:
        if not ids:
            continue
        any_content = True
        lines.append(f"**{title}**（{len(ids)} 项）")
        lines.extend(render(ids))
        lines.append("")

    if not any_content:
        lines.append("（还没有任何证据，也没有可判断的项。）")
        lines.append("")

    lines.extend(
        [
            "纪律：以上结论由系统计算得出。不要自行推断学习者的掌握程度，"
            "也不要杜撰清单以外的知识点。如果你认为某一条不对，"
            "请通过出题或追问产生新的证据，而不是直接断言状态有误。",
        ]
    )
    return "\n".join(lines)
