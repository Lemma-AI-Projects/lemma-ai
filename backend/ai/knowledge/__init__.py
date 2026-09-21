"""Knowledge — the deterministic instrument behind Learner State.

This package answers one question, and only one:

    given a space's knowledge structure and the evidence produced so far,
    what does this learner currently know?

It is **pure and offline**: nothing here reads a database, calls a model, or
keeps global state. That is the whole point. The learner's state is
*computed*, never *asserted* — a language model may produce evidence, but it
never produces the state. See `planning/learner-state-v1-execution-plan.md`
(red line R1) for why this is a boundary rather than a preference.

The theory is Knowledge Space Theory (Doignon & Falmagne). The load-bearing
simplification is documented in `ai.knowledge.state`.
"""

from ai.knowledge.state import (
    B_LEVEL_MIN_EVIDENCE,
    Edge,
    Evidence,
    Fringes,
    Item,
    ItemStatus,
    KnowledgeState,
    Origin,
    StateValue,
    Tier,
    Verdict,
    compute_fringes,
    derive_state,
    is_evidence_admissible,
    summarize,
)

__all__ = [
    "B_LEVEL_MIN_EVIDENCE",
    "Edge",
    "Evidence",
    "Fringes",
    "Item",
    "ItemStatus",
    "KnowledgeState",
    "Origin",
    "StateValue",
    "Tier",
    "Verdict",
    "compute_fringes",
    "derive_state",
    "is_evidence_admissible",
    "summarize",
]
