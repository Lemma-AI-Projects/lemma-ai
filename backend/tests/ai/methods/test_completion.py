"""Judging a completion rule — pure, no database, hand-built rows.

These are the cases that decide whether a Method is falsifiable. A criterion
the system cannot check is a label, and the three rules below are exactly where a
sloppy reading would make a promise look kept when it was not:

* "two correct in a row" read as "two correct ever" declares a stretch finished
  while the learner is still failing at it;
* forgetting that a helped success is `INERT` (the core's own rule at
  `ai/knowledge/state.py:291`) lets "I gave him a hint and he finished" count as
  an unassisted success — the exact thing the whole scaffolding mechanism exists
  to prevent;
* a `not_applicable` rule that returns True would congratulate the learner for
  nothing, every turn.
"""

from __future__ import annotations

import pytest

from ai.methods.completion import (
    completion_met,
    counts_toward_completion,
    restore_rule,
    rule_owes_completion,
)
from ai.methods.types import NOT_APPLICABLE, CompletionRule


class Row:
    """A hand-built evidence row. Named arguments keep each case readable."""

    def __init__(
        self,
        verdict: str = "correct",
        *,
        independent: bool = True,
        hint_used: bool = False,
        tier: str = "A",
    ) -> None:
        self.verdict = verdict
        self.independent = independent
        self.hint_used = hint_used
        self.tier = tier


def rows(*specs) -> list[Row]:
    return list(specs)


# --- 什么算一次 -------------------------------------------------------------


def test_only_a_correct_unassisted_answer_counts():
    assert counts_toward_completion(Row("correct")) is True
    # A helped success is written down and never counted — the core agrees
    # (`state.py:291`), and disagreement here would be a silent double standard.
    assert counts_toward_completion(Row("correct", hint_used=True)) is False
    # `independent` defaults True in the contract, but a row that says otherwise
    # must not slip through either.
    assert counts_toward_completion(Row("correct", independent=False)) is False
    # Wrong answers count for something (the direction is real and the core
    # records it) but never toward completion.
    assert counts_toward_completion(Row("incorrect")) is False
    assert counts_toward_completion(Row("no_verdict")) is False


# --- 连续 N 次 ---------------------------------------------------------------


def test_two_in_a_row_is_met_by_the_last_two_correct():
    rule = CompletionRule(kind="consecutive_correct", n=2)
    assert completion_met(rule, rows(Row(), Row())) is True
    assert completion_met(rule, rows(Row(), Row(), Row())) is True


def test_two_in_a_row_is_not_met_by_two_that_are_not_consecutive():
    """⚠️ 「连着两道」不是「历史上对过两道」。

    This is the case that separates a criterion from a mood. A learner who got
    it right last month and wrong yesterday has not done it twice in a row, and a
    cumulative reading would declare the stretch finished mid-failure.
    """
    rule = CompletionRule(kind="consecutive_correct", n=2)
    assert (
        completion_met(rule, rows(Row(), Row("incorrect"), Row())) is False
    ), "中间错过一次就不算连着两道"
    assert completion_met(rule, rows(Row("incorrect"), Row())) is False
    assert completion_met(rule, rows(Row(), Row("incorrect"))) is False


def test_a_helped_success_breaks_the_streak():
    """⚠️ 带着提示做对的那一条**不算**，所以它也断了连着。

    Not merely "does not count toward the two" — it breaks the sequence, because
    the promise was "two unassisted correct answers" and this one was not one.
    """
    rule = CompletionRule(kind="consecutive_correct", n=2)
    assert (
        completion_met(rule, rows(Row(), Row("correct", hint_used=True))) is False
    )
    # And the streak can be rebuilt afterwards: the helped row is not poison, it
    # just is not a step.
    assert (
        completion_met(
            rule, rows(Row(), Row("correct", hint_used=True), Row(), Row())
        )
        is True
    )


def test_one_in_a_row_is_met_by_a_single_correct():
    """Direct Explanation under an exam goal promises exactly this."""
    rule = CompletionRule(kind="consecutive_correct", n=1)
    assert completion_met(rule, rows(Row())) is True
    assert completion_met(rule, rows(Row("incorrect"))) is False
    assert completion_met(rule, rows(Row("correct", hint_used=True))) is False


def test_an_empty_history_never_meets_a_counting_rule():
    rule = CompletionRule(kind="consecutive_correct", n=2)
    assert completion_met(rule, []) is False
    assert completion_met(rule, rows(Row())) is False


def test_a_rule_of_zero_is_a_mistake_not_a_free_pass():
    """「做对零道」会被空历史满足 —— 那是一条错的判据，不是白送的通过。"""
    rule = CompletionRule(kind="consecutive_correct", n=0)
    assert completion_met(rule, []) is False
    assert rule_owes_completion(rule) is False


def test_a_negative_count_is_refused_the_same_way():
    assert rule_owes_completion(CompletionRule(kind="consecutive_correct", n=-1)) is (
        False
    )


# --- judged_observation ------------------------------------------------------


def test_judged_observation_wants_one_rubric_call_that_counted():
    """开放式作答没有可核对的确定事实，所以是 judged（tier B）而不是 verified。"""
    rule = CompletionRule(kind="judged_observation")
    assert completion_met(rule, rows(Row(tier="B"))) is True
    # A verified row is a different kind of claim: this rule asked for a
    # judgement, and one that never happened cannot satisfy it.
    assert completion_met(rule, rows(Row(tier="A"))) is False
    assert completion_met(rule, rows(Row(tier="B", hint_used=True))) is False
    assert completion_met(rule, rows(Row("incorrect", tier="B"))) is False
    assert completion_met(rule, []) is False


def test_judged_observation_ignores_n_because_it_is_not_a_count():
    """`n` 只对计数类有意义；给它一个 3 然后看全部历史，是把一条判据改成另一个。"""
    assert completion_met(CompletionRule(kind="judged_observation", n=3), rows(Row(tier="B"))) is True


# --- not_applicable ---------------------------------------------------------


def test_no_completion_owes_nothing_and_is_never_met():
    """`NOT_APPLICABLE` 永远 False，而那是**决定**不是缺口。

    Returning True would make every un-checkable rule look like an instant
    success, and the status bar would congratulate the learner for nothing.
    """
    assert completion_met(NOT_APPLICABLE, rows(Row(), Row())) is False
    assert rule_owes_completion(NOT_APPLICABLE) is False
    assert rule_owes_completion(CompletionRule(kind="consecutive_correct", n=1)) is True
    assert rule_owes_completion(CompletionRule(kind="judged_observation")) is True


# --- 输入顺序是调用方的责任 -------------------------------------------------


def test_the_order_is_the_callers_not_this_modules():
    """⚠️ 这个模块**不排序** —— 文档化的依赖，不是疏漏。

    Re-sorting here would make the answer depend on a comparison the module is
    not making, and `created_at` is not on the domain object at all:
    `knowledge_service.to_domain` builds rows in the order the query returned,
    which is already `created_at ASC`.
    """
    rule = CompletionRule(kind="consecutive_correct", n=2)
    correct_then_wrong = rows(Row(), Row("incorrect"))
    wrong_then_correct = rows(Row("incorrect"), Row())
    assert completion_met(rule, correct_then_wrong) is False
    assert completion_met(rule, wrong_then_correct) is False
    # Swapping the two rows changes the answer — which is the point: the caller
    # is responsible for handing over the last ones.
    assert completion_met(rule, rows(Row(), Row())) is True


# --- 快照读回 ----------------------------------------------------------------


def test_a_snapshotted_rule_reads_back_exactly():
    rule = CompletionRule(kind="consecutive_correct", n=2)
    assert restore_rule(rule.model_dump()) == rule


def test_an_unreadable_snapshot_refuses_rather_than_guessing():
    """⚠️ 读不回来的快照不是记录。

    A method that changed its rule shape leaves every open episode written
    before it un-checkable, and that has to be *stated* — swallowing it would
    quietly turn those episodes into "forever incomplete", which looks exactly
    like the learner never getting there.
    """
    with pytest.raises(ValueError, match="cannot read"):
        restore_rule({"kind": "a_kind_this_build_does_not_know"})
    with pytest.raises(ValueError, match="cannot read"):
        restore_rule({})


# --- 行本身不必是数据库行 ---------------------------------------------------


def test_any_object_with_the_three_attributes_works():
    """`Protocol` 而非 ORM 类：调用方可以传真件、领域对象或假行。

    A function of two arguments should be testable without a database, and
    binding it to `KnowledgeEvidence` would make that impossible for no gain.
    """
    class Duck:
        verdict = "correct"
        independent = True
        hint_used = False
        tier = "A"

    assert completion_met(CompletionRule(kind="consecutive_correct", n=1), [Duck()])


def test_the_core_domain_object_feeds_this_module_unchanged():
    """⚠️ `ai.knowledge.state.Evidence` must work **as is**, with no adapter.

    This is not a convenience check — it is the guarantee that the two layers
    agree about what a success is. `verdict` and `tier` are `StrEnum`s, so
    comparing them to the strings used here works because they *are* strings; if
    that ever stopped being true, every check in this module would silently
    return False and no promise would ever be judged met.
    """
    from ai.knowledge.state import Evidence, Verdict

    def counted() -> Evidence:
        return Evidence(
            item_id="换元后的上下限",
            verdict=Verdict.CORRECT,
            tier="B",
            independent=True,
            hint_used=False,
        )

    assert counts_toward_completion(counted()) is True
    assert completion_met(CompletionRule(kind="judged_observation"), [counted()])
    assert completion_met(CompletionRule(kind="consecutive_correct", n=2), [counted(), counted()])
    # And the same object with help given is the core's own `INERT` case, so the
    # two must agree it does not count.
    helped = Evidence(
        item_id="换元后的上下限",
        verdict=Verdict.CORRECT,
        tier="B",
        independent=True,
        hint_used=True,
    )
    assert counts_toward_completion(helped) is False
    assert (
        completion_met(CompletionRule(kind="consecutive_correct", n=1), [helped])
        is False
    )


def test_a_helped_success_is_inert_in_the_core_too():
    """把两条规则并排钉住：核心判它不计数，这里也判它不计数。

    The core's rule is `independent and not hint_used`
    (`ai/knowledge/state.py:291`). If the two ever diverge, the system would
    tell a learner a promise was kept while his state said otherwise — and
    nothing in either module would be able to see it.
    """
    from ai.knowledge.state import Evidence, Verdict, is_evidence_admissible

    helped = Evidence(
        item_id="x", verdict=Verdict.CORRECT, tier="B", independent=True, hint_used=True
    )
    assert is_evidence_admissible(helped) is False
    assert counts_toward_completion(helped) is False
