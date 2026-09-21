"""Learner-state derivation tests.

These are not just unit tests — cases 2, 3 and 8 are the *only* place in the
project where the claim "the state is computed, not invented" is checked
rather than asserted:

  * case 2  a correct answer obtained with a hint must NOT move the state
  * case 3  behaviour-only evidence (watched a video) must NOT move the state
  * case 8  under any evidence, the derived state is always a valid lower set

If these pass, the instrument is honest. If they fail, the brief is lying.
"""

from __future__ import annotations

import random

from ai.knowledge import (
    B_LEVEL_MIN_EVIDENCE,
    Edge,
    Evidence,
    Item,
    Origin,
    StateValue,
    Tier,
    Verdict,
    compute_fringes,
    derive_state,
    is_evidence_admissible,
    summarize,
)

ITEMS = [Item(id="a", label="A"), Item(id="b", label="B"), Item(id="c", label="C")]
CHAIN = [Edge(prerequisite_id="a", dependent_id="b"), Edge(prerequisite_id="b", dependent_id="c")]


def correct(item: str, **kw) -> Evidence:
    return Evidence(item_id=item, verdict=Verdict.CORRECT, **kw)


def wrong(item: str, **kw) -> Evidence:
    return Evidence(item_id=item, verdict=Verdict.INCORRECT, **kw)


def state_of(evidence, items=ITEMS, edges=CHAIN):
    return derive_state(items, edges, evidence)


# --- 1 · a single tier-A correct answer is enough ----------------------------


def test_single_tier_a_correct_marks_observed_mastered():
    state = state_of([correct("a")])
    assert state.value("a") is StateValue.MASTERED
    assert state.statuses["a"].origin is Origin.OBSERVED
    assert state.statuses["a"].evidence_count == 1


def test_single_tier_a_incorrect_marks_observed_not_mastered():
    state = state_of([wrong("a")])
    assert state.value("a") is StateValue.NOT_MASTERED
    assert state.statuses["a"].origin is Origin.OBSERVED


# --- 2 · a hinted correct answer must not count ------------------------------


def test_correct_with_hint_does_not_move_the_state():
    state = state_of([correct("a", hint_used=True)])
    assert state.value("a") is StateValue.UNASSESSED
    assert state.ignored_evidence == 1


def test_correct_without_independence_does_not_move_the_state():
    state = state_of([correct("a", independent=False)])
    assert state.value("a") is StateValue.UNASSESSED


def test_wrong_with_hint_still_counts():
    # The asymmetric rule: a wrong answer is informative even when aided.
    state = state_of([wrong("a", hint_used=True)])
    assert state.value("a") is StateValue.NOT_MASTERED


def test_admissibility_predicate_is_the_single_source_of_truth():
    assert is_evidence_admissible(correct("a"))
    assert not is_evidence_admissible(correct("a", hint_used=True))
    assert not is_evidence_admissible(correct("a", independent=False))
    assert not is_evidence_admissible(Evidence(item_id="a", verdict=Verdict.NO_VERDICT))
    assert not is_evidence_admissible(correct("a", tier=Tier.C))


# --- 3 · behaviour-only evidence never moves the state -----------------------


def test_tier_c_evidence_is_recorded_nowhere():
    state = state_of([correct("a", tier=Tier.C)])
    assert state.value("a") is StateValue.UNASSESSED
    assert state.statuses["a"].evidence_count == 0
    assert state.ignored_evidence == 1


# --- 4 · tier B needs two records -------------------------------------------


def test_one_tier_b_record_is_not_enough():
    state = state_of([correct("a", tier=Tier.B)])
    assert state.value("a") is StateValue.UNASSESSED


def test_two_tier_b_records_are_enough():
    state = state_of([correct("a", tier=Tier.B), correct("a", tier=Tier.B)])
    assert state.value("a") is StateValue.MASTERED
    assert state.statuses["a"].evidence_count == B_LEVEL_MIN_EVIDENCE


def test_a_tier_b_record_does_not_dilute_a_tier_a_record():
    state = state_of([correct("a"), correct("a", tier=Tier.B)])
    assert state.value("a") is StateValue.MASTERED
    assert state.statuses["a"].evidence_count == 1  # only the A record counted


# --- 5 / 6 · the two closure rules ------------------------------------------


def test_knowing_the_dependent_infers_the_prerequisite():
    state = state_of([correct("b")])
    assert state.value("b") is StateValue.MASTERED
    assert state.statuses["b"].origin is Origin.OBSERVED
    assert state.value("a") is StateValue.MASTERED
    assert state.statuses["a"].origin is Origin.INFERRED


def test_failing_a_prerequisite_infers_the_dependent_is_not_mastered():
    state = state_of([wrong("a")])
    assert state.value("a") is StateValue.NOT_MASTERED
    assert state.value("b") is StateValue.NOT_MASTERED
    assert state.statuses["b"].origin is Origin.INFERRED
    assert state.value("c") is StateValue.NOT_MASTERED


def test_closure_reaches_a_fixed_point_through_a_chain():
    state = state_of([correct("c")])
    assert state.mastered_ids == ["a", "b", "c"]
    assert [s.origin for s in state.statuses.values()] == [
        Origin.INFERRED,
        Origin.INFERRED,
        Origin.OBSERVED,
    ]


def test_unrelated_item_is_untouched_by_closure():
    items = [*ITEMS, Item(id="d", label="D")]
    state = derive_state(items, CHAIN, [correct("c")])
    assert state.value("d") is StateValue.UNASSESSED


# --- 7 · fringes -------------------------------------------------------------


def test_fringes_of_a_partially_known_chain():
    state = state_of([correct("b")])
    fringes = compute_fringes(state, ITEMS, CHAIN)
    assert fringes.outer == ["c"]  # prerequisites (b) all held
    # S = {a, b}; only b is maximal (a has b above it, inside S).
    assert fringes.inner == ["b"]
    assert "c" not in state.mastered_ids


def test_inner_fringe_is_the_maximal_element_only():
    state = state_of([correct("a")])
    fringes = compute_fringes(state, ITEMS, CHAIN)
    assert fringes.inner == ["a"]  # b is not mastered, so a has no successor in S
    assert fringes.outer == ["b"]


def test_outer_and_inner_are_disjoint_and_never_overlap_the_state():
    state = state_of([correct("b")])
    fringes = compute_fringes(state, ITEMS, CHAIN)
    assert not set(fringes.outer) & set(state.mastered_ids)
    assert set(fringes.inner) <= set(state.mastered_ids)
    assert not set(fringes.outer) & set(fringes.inner)


# --- 8 · the invariant ------------------------------------------------------


def _random_dag(rng: random.Random, n: int) -> list[Edge]:
    """Edges only ever point from a lower index to a higher one -> acyclic."""
    edges: list[Edge] = []
    ids = [f"i{k}" for k in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            if rng.random() < 0.35:
                edges.append(Edge(prerequisite_id=ids[i], dependent_id=ids[j]))
    return edges


def test_state_is_always_a_lower_set_under_random_evidence():
    rng = random.Random(20260920)
    for _ in range(200):
        n = rng.randint(2, 7)
        items = [Item(id=f"i{k}") for k in range(n)]
        edges = _random_dag(rng, n)
        evidence = [
            Evidence(
                item_id=rng.choice(items).id,
                verdict=rng.choice([Verdict.CORRECT, Verdict.INCORRECT]),
                tier=rng.choice([Tier.A, Tier.A, Tier.B, Tier.C]),
                independent=rng.random() < 0.8,
                hint_used=rng.random() < 0.3,
            )
            for _ in range(rng.randint(0, 12))
        ]
        state = derive_state(items, edges, evidence)
        assert state.is_lower_set(edges), (items, edges, evidence, state.statuses)


def test_derivation_does_not_depend_on_evidence_order():
    rng = random.Random(7)
    evidence = [
        correct("a"),
        wrong("b"),
        correct("c"),
        correct("b", tier=Tier.B),
    ]
    first = derive_state(ITEMS, CHAIN, evidence)
    shuffled = list(evidence)
    for _ in range(20):
        rng.shuffle(shuffled)
        other = derive_state(ITEMS, CHAIN, shuffled)
        assert {k: v.value for k, v in first.statuses.items()} == {
            k: v.value for k, v in other.statuses.items()
        }


# --- conflicts and violations ------------------------------------------------


def test_conflicting_records_resolve_conservatively():
    state = state_of([correct("a"), wrong("a")])
    assert state.value("a") is StateValue.NOT_MASTERED
    assert state.statuses["a"].evidence_count == 2


def test_a_contradicted_edge_is_recorded_as_a_violation_not_hidden():
    # b is directly observed as mastered, but its prerequisite a failed.
    state = state_of([correct("b"), wrong("a")])
    assert state.value("a") is StateValue.NOT_MASTERED
    assert state.value("b") is StateValue.NOT_MASTERED  # negative wins
    assert state.statuses["b"].origin is Origin.INFERRED
    assert state.overridden_ids == ["b"]
    assert [ (e.prerequisite_id, e.dependent_id) for e in state.violations ] == [("a", "b")]


# --- 9 · the empty case ------------------------------------------------------


def test_no_evidence_leaves_everything_unassessed():
    state = state_of([])
    assert set(state.unassessed_ids) == {"a", "b", "c"}
    assert state.mastered_ids == []
    assert state.not_mastered_ids == []
    fringes = compute_fringes(state, ITEMS, CHAIN)
    assert fringes.outer == ["a"]  # only the root is learnable from nothing
    assert fringes.inner == []


def test_no_items_at_all_degrades_honestly():
    state = derive_state([], [], [])
    assert state.statuses == {}
    fringes = compute_fringes(state, [], [])
    assert fringes.outer == [] and fringes.inner == []


# --- evidence about unknown / retired items ----------------------------------


def test_evidence_for_an_unknown_item_is_counted_and_dropped():
    state = state_of([correct("ghost")])
    assert state.ignored_evidence == 1
    assert "ghost" not in state.statuses


def test_retired_items_leave_the_state_but_keep_their_edges_harmless():
    items = [
        Item(id="a", label="A"),
        Item(id="b", label="B"),
        Item(id="c", label="C", active=False),
    ]
    state = derive_state(items, CHAIN, [correct("c")])
    assert "c" not in state.statuses  # retired item is not reported
    assert state.value("b") is StateValue.UNASSESSED  # its evidence can't leak


# --- summarize ---------------------------------------------------------------


def test_summarize_reports_facts_and_the_discipline_line():
    state = state_of([correct("b")])
    text = summarize(state, compute_fringes(state, ITEMS, CHAIN), ITEMS)
    assert "接下来可学" in text
    assert "不要自行推断" in text


def test_summarize_never_emits_a_percentage_or_a_mastery_score():
    state = state_of([correct("b")])
    text = summarize(state, compute_fringes(state, ITEMS, CHAIN), ITEMS)
    assert "%" not in text
    assert "掌握度" not in text
    assert "得分" not in text


def test_summarize_on_an_empty_space_says_so():
    text = summarize(derive_state([], [], []), compute_fringes(derive_state([], [], []), [], []), [])
    assert "还没有知识结构" in text
