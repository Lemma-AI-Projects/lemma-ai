"""Practice — the shared floor under every surface that asks a question.

## Why this module exists

There are two question surfaces in the product and they do not share anything:
the Question Bank grades locally and stores per-slot verdicts; Free Course
mixes local comparison with an LLM on open items and stores a `verdict` plus an
`is_correct`. Neither one's results are consumed by the learning system.

This module is **not** a new question store and **not** a new grading engine. It
is the smallest seam that lets both surfaces speak one language, so that:

* a surface can say "here is what happened" without naming a project, a space or
  the other surface;
* the evaluation keeps whatever shape it had — an open-ended judgement is **not**
  squeezed into a boolean;
* and the thing that decides whether a result may become evidence is still
  `evidence_entry.admit_outcome`, the one door that already exists.

## What it deliberately does not do

* No new database tables. `question_sets` / `question_set_attempts` /
  `question_attempts` stay where they are.
* No provider registry, no marketplace, no ontology.
* No re-grading. An adapter translates an existing result; it never recomputes one.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Literal, Mapping

# What a surface's evaluation concluded. **Not a boolean.**
#:
#: `supported` / `partially_supported` / `unsupported` exist because an open-ended
#: judgement is genuinely not one of two things, and the moment it is stored as
#: `is_correct` the difference is gone forever. `ungradable` is separate from
#: `unsupported` on purpose: "we could not judge this" and "we judged it and it
#: did not hold" lead to opposite product decisions.
PracticeVerdict = Literal[
    "supported",
    "partially_supported",
    "unsupported",
    "ungradable",
    "pending",
]

#: Verdicts that carry no learning signal at all. They are still recorded, but
#: they are not eligible to become evidence — see `evidence.py`.
NON_SIGNALLING: frozenset[PracticeVerdict] = frozenset({"ungradable", "pending"})

#: How the evaluation was produced. Kept so that a later reader can tell a
#: deterministic judgement from a model's, which matters when deciding how much
#: weight to give it.
EvaluationMethod = Literal["deterministic", "llm", "mixed", "none"]


@dataclass(frozen=True)
class PracticeEvaluation:
    """One graded interaction, in a shape both surfaces can produce.

    `reference` points back at whatever the surface actually stores — a
    `question_attempts.id` for the bank, a `course_lesson_observations.id` for a
    course. It is deliberately an opaque string: this module must not need to
    know which surface it came from.
    """

    reference: str
    verdict: PracticeVerdict
    method: EvaluationMethod
    #: Free text shown to the learner. Optional — the bank does not produce any.
    feedback: str | None = None
    #: Any extra the surface wants to keep reachable (slot breakdown, score,
    #: what the model was shown). Never interpreted here.
    detail: Mapping[str, Any] = field(default_factory=dict)
    #: Whether the learner answered without help. `None` when the surface cannot
    #: tell, which is different from `False`.
    hint_used: bool | None = None

    @property
    def is_signalling(self) -> bool:
        """Whether this evaluation says anything about learning.

        An ungradable attempt is not a wrong answer, and treating it as one is
        how a learning system ends up marking somebody as not understanding
        something they simply answered in a format nothing could read.
        """
        return self.verdict not in NON_SIGNALLING

    @property
    def counts_as_success(self) -> bool | None:
        """True / False / **None**.

        `None` for everything partial or ungraded, and the whole reason this
        dataclass exists: a caller that wants a boolean must decide explicitly
        what to do about a partially supported answer, rather than having one
        silently chosen for it.
        """
        if not self.is_signalling:
            return None
        if self.verdict == "supported":
            return True
        if self.verdict == "unsupported":
            return False
        return None


def from_bank_grade(
    *,
    attempt_id: uuid.UUID | str,
    status: str,
    slots: list[Any],
    total_earned: int | None = None,
    total_possible: int | None = None,
) -> PracticeEvaluation:
    """Translate a Question Bank `GradeResult` (see `qbank/grading/judge.py`).

    The bank grades deterministically and reports per slot. Collapsing that to a
    single verdict would throw away the only thing it has that the course path
    does not — so the slots ride along in `detail`, and the top-level verdict is
    derived only when the slots actually agree.
    """
    verdicts = [getattr(slot, "verdict", None) for slot in slots]
    verdicts = [v for v in verdicts if v]
    detail: dict[str, Any] = {"slots": [
        {
            "slotId": getattr(slot, "slot_id", None),
            "verdict": getattr(slot, "verdict", None),
            "score": getattr(slot, "score", None),
        }
        for slot in slots
    ]}
    if total_earned is not None and total_possible is not None:
        detail["score"] = {"earned": total_earned, "possible": total_possible}

    if status == "ungradable" or not verdicts:
        return PracticeEvaluation(
            reference=str(attempt_id),
            verdict="ungradable",
            method="deterministic",
            detail=detail,
        )

    if "correct" in verdicts and all(v == "correct" for v in verdicts):
        return PracticeEvaluation(
            reference=str(attempt_id), verdict="supported",
            method="deterministic", detail=detail,
        )
    if "correct" in verdicts:
        # Mixed. A slot right and a slot wrong is **partial credit**, not a wrong
        # answer — the learner got something. Falling through to `unsupported`
        # here would be the single most damaging mistake this adapter could make,
        # because it is invisible afterwards: the state derived from it looks
        # exactly like the state derived from understanding nothing.
        return PracticeEvaluation(
            reference=str(attempt_id), verdict="partially_supported",
            method="deterministic", detail=detail,
        )
    if all(v in ("correct", "unanswered") for v in verdicts) and "correct" in verdicts:
        return PracticeEvaluation(
            reference=str(attempt_id), verdict="partially_supported",
            method="deterministic", detail=detail,
        )
    if "not-graded" in verdicts:
        # Mixed: some slots were readable, some were not. Saying "unsupported"
        # here would blame the learner for a format the grader could not parse.
        return PracticeEvaluation(
            reference=str(attempt_id), verdict="partially_supported",
            method="deterministic", detail=detail,
        )
    return PracticeEvaluation(
        reference=str(attempt_id), verdict="unsupported",
        method="deterministic", detail=detail,
    )


def from_course_observation(
    *,
    observation_id: uuid.UUID | str,
    verdict: str | None,
    is_correct: bool | None,
    feedback: str | None = None,
) -> PracticeEvaluation:
    """Translate a `CourseLessonObservation` row.

    ⚠️ The bank's grader is local and complete; this one is **not**. It mixes a
    local comparison for objective items with a model on open ones
    (`free_course_service.py:585-603`). So the method is recorded honestly as
    `mixed` — a reader comparing the two surfaces' evidence must be able to see
    that one of them had a model in the loop.
    """
    if verdict is None and is_correct is None:
        return PracticeEvaluation(
            reference=str(observation_id), verdict="pending",
            method="mixed", feedback=feedback,
        )
    if is_correct is True or verdict in ("correct", "supported"):
        return PracticeEvaluation(
            reference=str(observation_id), verdict="supported",
            method="mixed", feedback=feedback,
        )
    if is_correct is False or verdict in ("incorrect", "unsupported"):
        return PracticeEvaluation(
            reference=str(observation_id), verdict="unsupported",
            method="mixed", feedback=feedback,
        )
    # A verdict we recognise as a word but not as a verdict: keep it, do not
    # guess. Guessing here is how "partially right" quietly becomes "wrong".
    return PracticeEvaluation(
        reference=str(observation_id), verdict="partially_supported",
        method="mixed", feedback=feedback,
    )