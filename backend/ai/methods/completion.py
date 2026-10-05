"""Judging whether a Method's promise was kept.

A Method declares what would make it work (`CompletionRule`), and this module
decides whether that happened. Everything else in the Method layer is about
*producing* the intervention; this is the only place that asks whether it
worked — and it is what makes a Method falsifiable rather than a manner of
speaking.

Three properties, and each one is load-bearing:

  * **Evidence alone, no clock.** A rule is checked against evidence rows and
    nothing else — not "how long has this been running", not when the episode
    opened. That is what lets the answer be recomputed from the table at any
    time, and it is why `method_episodes` stores `opened_at` without anything
    reading it for judgement. A timeout is a decision nothing in the evidence
    supports.
  * **Recent and consecutive, not cumulative.** "Two correct answers in a row"
    means the last two, not "two at some point in history". A learner who got
    it right last month and wrong yesterday has not done it twice in a row, and
    a cumulative reading would declare that stretch finished while he is still
    failing at it.
  * **`hint_used` counts against it.** A correct answer the learner produced
    after help is `INERT` in the core (`ai/knowledge/state.py:291`) — written
    down, never counted. This module agrees with the core on purpose: the two
    must not disagree about what a success is, or "we said two unassisted and
    the state says otherwise" becomes a thing nobody can debug.

It lives in `ai/methods/` rather than in a service because it judges a
`CompletionRule`, which is the method layer's own vocabulary, and because a pure
function of two arguments is testable without a database — the tests below run
on hand-built rows for exactly that reason.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any, Protocol

from ai.methods.types import NOT_APPLICABLE, CompletionRule


class EvidenceRow(Protocol):
    """What this module needs to see.

    A `Protocol` rather than `KnowledgeEvidence` so the caller can pass domain
    objects, ORM rows, or hand-built fakes. The three attributes read are the
    ones the core's own rule reads (`ai/knowledge/state.py:291`), so agreement
    between the two is structural rather than coincidental.
    """

    verdict: str
    independent: bool
    hint_used: bool
    tier: str


def counts_toward_completion(row: EvidenceRow) -> bool:
    """Did this one record count?

    A correct, unassisted, independently produced answer. Everything else is
    still worth having written down (a helped success is the record that lets a
    method drop its help later) — it just does not move this particular count.
    """
    return (
        row.verdict == "correct" and row.independent and not row.hint_used
    )


def _recent(rows: Sequence[EvidenceRow], n: int) -> list[EvidenceRow]:
    """The last `n` rows, oldest first. **The order of `rows` is the caller's.**

    This module does not sort by time. A rule that reorders its input would make
    the answer depend on a comparison it is not making, and `created_at` is not
    even present on the domain object — `knowledge_service.to_domain` builds
    these in the order the query returned, which is already
    `created_at ASC` (`list_evidence`). Documenting the dependency is cheaper
    than sorting twice.
    """
    return list(rows)[-n:] if n > 0 else []


def completion_met(
    rule: CompletionRule, rows: Sequence[EvidenceRow]
) -> bool:
    """Has this promise been kept?

    `NOT_APPLICABLE` always answers False, and that is a **decision, not a gap**:
    a rule nobody intends to check cannot be met, and a method that owes no
    completion must not open an episode at all (see
    `services/method_episode_service.open_episode`'s callers). Returning True
    here would make every un-checkable rule look like an instant success, and
    every status bar would congratulate the learner for nothing.
    """
    if rule.kind == "not_applicable":
        return False
    if rule.n < 1:
        # A rule of zero is a mistake, not a free pass: "make zero consecutive
        # correct answers" is satisfiable by an empty history.
        return False
    if rule.kind == "consecutive_correct":
        recent = _recent(rows, rule.n)
        return len(recent) == rule.n and all(
            counts_toward_completion(row) for row in recent
        )
    if rule.kind == "judged_observation":
        # Judged, not verified: an open-ended answer has no definite thing to
        # check against, so it needs a rubric call — and it still needs to be
        # unassisted, or "he explained it" would count when we led him there.
        return any(
            row.tier == "B" and counts_toward_completion(row) for row in rows
        )
    return False


def rule_owes_completion(rule: CompletionRule) -> bool:
    """Should a stretch of work be opened under this rule at all?

    The gate in front of `open_episode`. A stretch with no criterion is a
    paragraph, and tracking it as an episode would make "a promise is in
    progress" look true for every turn that happens to have a method running.
    """
    return rule.kind != "not_applicable" and rule.n >= 1


def restore_rule(payload: dict[str, Any]) -> CompletionRule:
    """Rebuild a `CompletionRule` from an episode row's snapshot.

    Episodes store the declared rule so that "what did it promise" survives the
    method being uninstalled. A snapshot that cannot be read back is not a
    record, so this refuses rather than guessing — and an unreadable rule makes
    the episode un-checkable, which is stated rather than swallowed: a method
    changed its rule shape, and every open episode written before that needs
    looking at.
    """
    try:
        return CompletionRule.model_validate(payload)
    except Exception as exc:  # noqa: BLE001 — any failure means the shape moved
        raise ValueError(
            f"episode holds a completion rule this build cannot read: {payload!r}"
        ) from exc


__all__ = [
    "NOT_APPLICABLE",
    "EvidenceRow",
    "completion_met",
    "counts_toward_completion",
    "restore_rule",
    "rule_owes_completion",
]
