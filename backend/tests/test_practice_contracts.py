"""The practice contract, tested where it can be wrong.

These are the guards the foundation actually promises: an ungradable attempt is
not a wrong answer, a partial answer is not a boolean, the bank and the course
translate into one shape, and one attempt admits once.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

import pytest

from services.practice import (
    EvidenceOutcome,
    NON_SIGNALLING,
    from_bank_grade,
    from_course_observation,
    submit_as_evidence,
)


@dataclass
class _Slot:
    slot_id: str
    verdict: str
    score: dict[str, int] | None = None


# ── the verdict is not a boolean ──────────────────────────────────────────────

def test_ungradable_is_not_unsupported():
    """An unreadable submission is not a wrong one.

    This is the distinction the whole module exists for: if `ungradable` were
    folded into `unsupported`, a learner who typed an answer in a format nothing
    could parse would be recorded as not understanding the topic.
    """
    ev = from_bank_grade(attempt_id="a1", status="ungradable", slots=[])
    assert ev.verdict == "ungradable"
    assert "ungradable" in NON_SIGNALLING
    assert ev.is_signalling is False
    assert ev.counts_as_success is None


def test_partial_answer_is_not_rounded_to_wrong():
    ev = from_bank_grade(
        attempt_id="a2",
        status="graded",
        slots=[_Slot("s1", "correct"), _Slot("s2", "incorrect")],
    )
    assert ev.verdict == "partially_supported"
    assert ev.counts_as_success is None, "a caller must decide, not be handed False"


def test_all_correct_is_supported():
    ev = from_bank_grade(
        attempt_id="a3", status="graded", slots=[_Slot("s1", "correct")],
        total_earned=4, total_possible=4,
    )
    assert ev.verdict == "supported"
    assert ev.counts_as_success is True
    assert ev.detail["score"] == {"earned": 4, "possible": 4}


def test_partly_unanswered_is_partial_not_unsupported():
    ev = from_bank_grade(
        attempt_id="a4",
        status="graded",
        slots=[_Slot("s1", "correct"), _Slot("s2", "unanswered")],
    )
    assert ev.verdict == "partially_supported"


def test_ungraded_slot_does_not_blame_the_learner():
    """One unreadable slot among readable ones must not become `unsupported`."""
    ev = from_bank_grade(
        attempt_id="a5",
        status="graded",
        slots=[_Slot("s1", "incorrect"), _Slot("s2", "not-graded")],
    )
    assert ev.verdict == "partially_supported"


def test_all_wrong_is_unsupported():
    ev = from_bank_grade(
        attempt_id="a6", status="graded", slots=[_Slot("s1", "incorrect")],
    )
    assert ev.verdict == "unsupported"
    assert ev.counts_as_success is False


# ── both surfaces produce one shape ───────────────────────────────────────────

def test_bank_and_course_translate_into_the_same_contract():
    bank = from_bank_grade(
        attempt_id="b1", status="graded", slots=[_Slot("s1", "correct")],
    )
    course = from_course_observation(
        observation_id="c1", verdict="correct", is_correct=True,
    )
    assert (bank.verdict, bank.counts_as_success) == (
        course.verdict, course.counts_as_success
    )


def test_course_method_is_recorded_as_mixed():
    """Free Course put a model in the loop; a later reader must be able to see it.

    The bank grades locally and completely, the course does not
    (`free_course_service.py:585-603`). If both reported the same method, evidence
    from the two would look equally trustworthy when they are not.
    """
    course = from_course_observation(
        observation_id="c2", verdict=None, is_correct=None,
    )
    assert course.method == "mixed"
    assert course.verdict == "pending"
    assert course.is_signalling is False

    bank = from_bank_grade(attempt_id="b2", status="graded", slots=[_Slot("s1", "correct")])
    assert bank.method == "deterministic"


# ── the two guards in front of the evidence door ─────────────────────────────

class _Result:
    def __init__(self, rid):
        self.id = rid


@pytest.mark.asyncio
async def test_ungradable_attempt_never_reaches_the_evidence_door():
    """Guard 1: no signal, no write.

    Asserted with a db object that would explode if it were touched — the point
    is that `admit_outcome` is not merely un-called but unreachable.
    """
    class _Exploding:
        async def execute(self, *a, **k):
            raise AssertionError("touched the database")

    ev = from_bank_grade(attempt_id="x1", status="ungradable", slots=[])
    result = await submit_as_evidence(
        _Exploding(),  # type: ignore[arg-type]
        user_id=uuid.uuid4(),
        scope_ref="space:none",
        evaluation=ev,
        item_id=uuid.uuid4(),
    )
    assert result.outcome is EvidenceOutcome.NOT_SIGNALLING
    assert result.admitted is False


@pytest.mark.asyncio
async def test_attempt_without_a_knowledge_item_is_unbindable_not_guessed():
    """Guard 2: no item, no evidence — and no fuzzy match either.

    The bank's items are keyed by an external catalogue id and `knowledge_items`
    by Lemma UUIDs; no mapping exists. Guessing would write a confidently wrong
    attribution that later cannot be corrected without also correcting the state
    derived from it.
    """
    class _Exploding:
        async def execute(self, *a, **k):
            raise AssertionError("touched the database")

    ev = from_bank_grade(attempt_id="x2", status="graded", slots=[_Slot("s1", "correct")])
    result = await submit_as_evidence(
        _Exploding(),  # type: ignore[arg-type]
        user_id=uuid.uuid4(),
        scope_ref="space:none",
        evaluation=ev,
        item_id=None,
        item_label=None,
    )
    assert result.outcome is EvidenceOutcome.UNBINDABLE
    assert "item" in (result.detail or "")