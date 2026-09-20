"""Service-level guards that must not depend on a database.

Two of them, both load-bearing:

  * `_would_cycle` — the acyclicity invariant. A cycle silently destroys the
    definition of a feasible state as a lower set, and therefore the entire
    derivation; nothing downstream would report it.
  * `LearningBriefOut.to_wire` — the promise made to
    `frontend/src/features/learn-space/brief/types.ts`, including the part that
    is easiest to break by accident: three sections must be *absent* when empty,
    while six keys must be present even when null.
"""

from __future__ import annotations

import uuid

from models import KnowledgeEdge
from schemas.knowledge import LearningBriefNextStep, LearningBriefOut
from services.knowledge_service import _reason_for_step, _would_cycle

A, B, C, D = (uuid.uuid4() for _ in range(4))
PROJECT = uuid.uuid4()


def edge(source: uuid.UUID, target: uuid.UUID) -> KnowledgeEdge:
    return KnowledgeEdge(
        project_id=PROJECT, from_item_id=source, to_item_id=target
    )


# --- the acyclicity guard ----------------------------------------------------


def test_adding_an_edge_to_an_empty_graph_is_fine():
    assert not _would_cycle([], A, B)


def test_self_loop_is_refused():
    assert _would_cycle([], A, A)


def test_direct_back_edge_is_refused():
    assert _would_cycle([edge(A, B)], B, A)


def test_transitive_back_edge_is_refused():
    # a -> b -> c ; adding c -> a closes the cycle.
    assert _would_cycle([edge(A, B), edge(B, C)], C, A)


def test_unrelated_edge_is_allowed():
    assert not _would_cycle([edge(A, B), edge(B, C)], A, C)
    assert not _would_cycle([edge(A, B), edge(B, C)], D, A)
    assert not _would_cycle([edge(A, B), edge(B, C)], C, D)


def test_a_diamond_is_not_a_cycle():
    # a -> b, a -> c, b -> d, c -> d  (two paths, no cycle)
    edges = [edge(A, B), edge(A, C), edge(B, D), edge(C, D)]
    assert not _would_cycle(edges, A, D)


# --- the brief wire contract -------------------------------------------------


ALWAYS_PRESENT = {
    "projectId",
    "spaceName",
    "goal",
    "isGoalInferred",
    "nextSteps",
    "generatedAt",
}
OPTIONAL_SECTIONS = {"doing", "alreadyHave", "developing", "mainObstacle"}


def test_empty_brief_carries_exactly_the_always_present_keys():
    wire = LearningBriefOut(project_id=PROJECT, space_name="S").to_wire()
    assert set(wire) == ALWAYS_PRESENT
    assert wire["goal"] is None
    assert wire["isGoalInferred"] is False
    assert wire["nextSteps"] == []
    assert wire["generatedAt"] is None


def test_empty_evidence_sections_are_absent_not_empty():
    wire = LearningBriefOut(
        project_id=PROJECT,
        space_name="S",
        doing=[],
        already_have=[],
        developing=[],
        main_obstacle=None,
    ).to_wire()
    assert not (set(wire) & OPTIONAL_SECTIONS)


def test_populated_sections_survive():
    wire = LearningBriefOut(
        project_id=PROJECT,
        space_name="S",
        already_have=["能解一元一次方程"],
        developing=["能解复合不等式"],
        main_obstacle="「能解一元一次方程」还没过 —— 接下来有 2 项卡在它后面",
    ).to_wire()
    assert wire["alreadyHave"] == ["能解一元一次方程"]
    assert wire["developing"] == ["能解复合不等式"]
    assert "mainObstacle" in wire


def test_next_step_only_carries_the_keys_it_has():
    step = LearningBriefNextStep(id=A, title="能解复合不等式", reason="它的前提你都具备了")
    wire = LearningBriefOut(
        project_id=PROJECT, space_name="S", next_steps=[step]
    ).to_wire()
    assert wire["nextSteps"] == [
        {"id": str(A), "title": "能解复合不等式", "reason": "它的前提你都具备了"}
    ]
    assert "href" not in wire["nextSteps"][0]  # no course link in Phase 1
    assert "prompt" not in wire["nextSteps"][0]


def test_brief_carries_no_numeric_leaf_that_could_read_as_a_score():
    wire = LearningBriefOut(
        project_id=PROJECT,
        space_name="S",
        doing=["A"],
        already_have=["A"],
        developing=["B"],
        main_obstacle="blocked",
        next_steps=[LearningBriefNextStep(id=A, title="A", reason="r")],
    ).to_wire()

    def leaves(value):
        if isinstance(value, dict):
            for item in value.values():
                yield from leaves(item)
        elif isinstance(value, list):
            for item in value:
                yield from leaves(item)
        else:
            yield value

    for leaf in leaves(wire):
        # Strings, booleans and nulls only: there is no integer or float
        # anywhere, so no field can be mistaken for a score or a percentage.
        assert isinstance(leaf, (str, bool, type(None))), leaf


# --- step reasons ------------------------------------------------------------


def test_step_reason_without_records_says_untested():
    reason = _reason_for_step(status=None, evidence_count=0)
    assert "还没有测过" in reason


def test_step_reason_counts_records_without_scoring():
    reason = _reason_for_step(status=None, evidence_count=3)
    assert "3 条记录" in reason
    assert "%" not in reason
