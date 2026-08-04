"""learner_assess — cognitive-change review prompt for the background review.

W1.1: the background self-review fork (agent/background_review.py) normally
extracts persona/preferences with _COMBINED_REVIEW_PROMPT. For LemmaHermes we
override that prompt with a cognitive-change analysis that writes learner
state instead of prose memory.

The prompt is read from ``agent._COMBINED_REVIEW_PROMPT`` at fork time
(background_review.py:1006-1012), so wiring this is a pure string swap plus a
tool-whitelist extension — no change to the review loop itself.
"""

from __future__ import annotations


def build_cognitive_review_prompt() -> str:
    """Full replacement for _COMBINED_REVIEW_PROMPT when learner is enabled.

    Keeps the original memory+skills behavior and ADDS the learner-state
    analysis. The hard rule: only demonstrated understanding is a test;
    absence of failure is NOT success.
    """
    return (
        "Review the conversation above and update three things:\n\n"
        "**Memory**: who the user is. Did the user reveal persona, desires, "
        "preferences, or personal details? Save facts with the memory tool.\n\n"
        "**Skills**: how to do this class of task. Be ACTIVE — most sessions "
        "produce at least one skill update. Prefer updating a class-level "
        "umbrella skill (patch it, or add a references/ support file) over "
        "creating a narrow one-session skill. Protected skills (bundled, hub, "
        "pinned, user-owned) are off-limits.\n\n"
        "**Learner state** (NEW — this is the most important part): analyze "
        "COGNITIVE CHANGE in this session, not conversation topics.\n"
        "  • User DEMONSTRATED understanding of a concept — explained it back, "
        "solved a problem, answered a question correctly? "
        "→ learner_state action=upsert_concept concept=<topic> success=true\n"
        "  • User failed, got stuck, or said 'too abstract' / 'I don't get it'? "
        "→ learner_state action=record_episode goal=<topic> result=failed "
        "reason=<why> new_strategy=<what to try next>\n"
        "  • A teaching method clearly worked or failed (user praised an "
        "analogy, rejected equations)? "
        "→ learner_state action=record_episode concept=<topic> method=<method> "
        "result=success|failed\n"
        "  • A concept was merely mentioned or asked about? "
        "→ learner_state action=upsert_concept concept=<topic> exposed=true "
        "(taught, NOT tested — never count 'asked about' as mastery)\n\n"
        "RULES for learner state:\n"
        "  - ONLY demonstrated understanding counts as success=true. "
        "Absence of failure is NOT success.\n"
        "  - One concept, one node. Update it, don't create duplicates.\n"
        "  - If nothing stands out for learner state, skip it — 'Nothing to "
        "save.' is acceptable for a session with no cognitive change.\n\n"
        "Do NOT capture (these harden into bad constraints):\n"
        "  • Environment-dependent failures (missing binaries, unconfigured "
        "credentials, 'command not found') — the user can fix these.\n"
        "  • Negative claims about tools ('X is broken', 'cannot use Y') — "
        "these become self-cited refusals.\n"
        "  • One-off task narratives that are not a class of work.\n"
        "  • Unresolved failures: never write up a sequence of dead ends as a "
        "validated workflow.\n\n"
        "When done, summarize what you saved (memory / skills / learner state)."
    )
