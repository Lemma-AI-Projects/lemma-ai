"""Practice — shared contracts for every surface that asks a question.

Two adapters and one door. The adapters translate what a surface already
produced; the door is `evidence_entry.admit_outcome`, which is the only place in
this codebase allowed to decide that something becomes evidence.
"""

from services.practice.contracts import (
    NON_SIGNALLING,
    EvaluationMethod,
    PracticeEvaluation,
    PracticeVerdict,
    from_bank_grade,
    from_course_observation,
)
from services.practice.evidence import (
    SURFACE,
    EvidenceOutcome,
    EvidenceResult,
    submit_as_evidence,
)

__all__ = [
    "PracticeEvaluation",
    "PracticeVerdict",
    "EvaluationMethod",
    "NON_SIGNALLING",
    "from_bank_grade",
    "from_course_observation",
    "submit_as_evidence",
    "EvidenceOutcome",
    "EvidenceResult",
    "SURFACE",
]