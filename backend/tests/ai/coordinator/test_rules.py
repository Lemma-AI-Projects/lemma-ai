"""Coordinator rules — the four cases the brief names, and their edges.

This is the test of the *decision*, not of any wording, and it needs no database
and no model: `decide()` is a pure function of a `Snapshot`, so the cases are
constructed rather than provoked. Each case below asserts two separate claims —
the finding ("the state says X") and the action ("therefore we do Y") — because a
bug in either one produces the same wrong decision and only this split says which.

    Case 1  nothing worth doing             -> NO_ACTION
    Case 2  something just became learnable -> INTRODUCE   (in a conversation)
    Case 3  they had it and just lost it    -> REVIEW      (in a conversation)
    Case 4  the learner is not in the room  -> NOTIFY      (same finding, delivered)

The delivery split is the one non-obvious rule: the *finding* is about the
learner, the *action* is about who is there to act on it. `source` is how the
caller states that, and both directions are asserted so neither can silently win.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from ai.coordinator import (
    EVENT_LEARNER_STATE_UPDATED,
    SOURCE_API,
    SOURCE_CHAT,
    Action,
    CoordinatorEvent,
    FocusItem,
    Snapshot,
    Urgency,
    decide,
    find,
)
from ai.coordinator.rules import _URGENCY  # the table itself, asserted as data
from ai.knowledge.state import StateValue

NOW = datetime(2026, 9, 24, 12, 0, tzinfo=UTC)


def snapshot(
    *,
    focus: FocusItem | None,
    ready: tuple[str, ...] = (),
    mastered: tuple[str, ...] = ("矩阵基础",),
    source: str = SOURCE_CHAT,
    event_type: str = EVENT_LEARNER_STATE_UPDATED,
) -> Snapshot:
    return Snapshot(
        event=CoordinatorEvent(type=event_type, payload={}, source=source),
        current_time=NOW,
        space_id="space-1",
        space_name="线性代数 · 第 12 讲",
        focus=focus,
        mastered=mastered if focus is None else (focus.label, *mastered),
        ready=ready,
        available_actions=tuple(action.value for action in Action),
    )


def focus(
    *,
    value: str,
    previous_value: str = "unassessed",
    label: str = "线性无关",
    evidence_count: int = 1,
) -> FocusItem:
    return FocusItem(
        id="item-1",
        label=label,
        value=value,
        origin="observed",
        evidence_count=evidence_count,
        last_confirmed_at=NOW,
        previous_value=previous_value,
    )


# --- Case 1: nothing worth doing --------------------------------------------


def test_case_1_one_rubric_record_does_not_settle_anything_so_do_nothing():
    """A single tier-B judgement leaves the item unassessed — reacting to it
    would be reacting to noise, so there is nothing to do *yet*."""
    snap = snapshot(focus=focus(value=StateValue.UNASSESSED.value))

    finding, _target, reason = find(snap)
    decision = decide(snap)
    assert finding.value == "unsettled"
    assert decision.action is Action.NO_ACTION
    assert decision.urgency is Urgency.LOW
    assert "定案" in decision.reason
    # The state value is carried, so the log can explain itself afterwards.
    assert decision.payload["focusValue"] == StateValue.UNASSESSED.value
    assert reason


def test_case_1_mastered_with_nothing_ready_is_nothing_to_do():
    snap = snapshot(focus=focus(value=StateValue.MASTERED.value), ready=())

    decision = decide(snap)
    assert decision.action is Action.NO_ACTION
    assert decision.urgency is Urgency.LOW
    assert "没有下一步可学" in decision.reason


def test_case_1_no_focus_item_is_nothing_to_do():
    decision = decide(snapshot(focus=None, ready=("特征值",)))
    assert decision.action is Action.NO_ACTION
    assert "知识结构" in decision.reason


def test_case_1_an_unknown_event_type_is_refused_not_guessed():
    decision = decide(snapshot(focus=focus(value=StateValue.MASTERED.value), event_type="goal.changed"))
    assert decision.action is Action.NO_ACTION
    assert "goal.changed" in decision.reason


# --- Case 2: something just became learnable --------------------------------


def test_case_2_in_a_conversation_the_next_ready_item_is_introduced():
    snap = snapshot(
        focus=focus(value=StateValue.MASTERED.value, previous_value="unassessed"),
        ready=("特征值", "特征向量"),
        source=SOURCE_CHAT,
    )

    finding, target, _reason = find(snap)
    decision = decide(snap)
    assert finding.value == "next_step"
    # The FIRST ready item, deterministically — V0 has no ranking and says so.
    assert target == "特征值"
    assert decision.action is Action.INTRODUCE
    assert decision.target == "特征值"
    assert decision.urgency is Urgency.NORMAL
    assert decision.payload["finding"] == "next_step"
    assert decision.payload["targetLabel"] == "特征值"


def test_case_2_the_reason_names_both_the_item_and_what_became_ready():
    decision = decide(
        snapshot(focus=focus(value=StateValue.MASTERED.value), ready=("特征值",))
    )
    assert "线性无关" in decision.reason
    assert "特征值" in decision.reason


# --- Case 3: they had it and just lost it -----------------------------------


def test_case_3_a_lapse_is_a_review():
    snap = snapshot(
        focus=focus(
            value=StateValue.NOT_MASTERED.value,
            previous_value=StateValue.MASTERED.value,
            evidence_count=2,
        ),
        ready=("特征值",),
        source=SOURCE_CHAT,
    )

    finding, target, _reason = find(snap)
    decision = decide(snap)
    assert finding.value == "lapse"
    assert target == "线性无关"
    assert decision.action is Action.REVIEW
    # Losing something you had outranks everything else on the list.
    assert decision.urgency is Urgency.HIGH
    assert "此前做对过" in decision.reason


def test_failing_something_you_never_had_is_continuing_not_reviewing():
    """The pair to the case above: same value, different history, different
    action. `previous_value` is the whole difference."""
    snap = snapshot(
        focus=focus(
            value=StateValue.NOT_MASTERED.value, previous_value="unassessed"
        ),
        ready=("特征值",),
        source=SOURCE_CHAT,
    )
    decision = decide(snap)
    assert decision.action is Action.CONTINUE
    assert decision.target == "线性无关"
    assert decision.urgency is Urgency.NORMAL


# --- Case 4: nobody is in the room -----------------------------------------


def test_case_4_the_same_finding_from_a_background_surface_becomes_a_notification():
    snap = snapshot(
        focus=focus(value=StateValue.MASTERED.value),
        ready=("特征值",),
        source=SOURCE_API,
    )
    decision = decide(snap)
    assert decision.action is Action.NOTIFY
    assert decision.target == "特征值"
    # The reason says both facts: what the state says AND why the channel changed.
    assert "前提都已满足" in decision.reason
    assert "没有活跃对话" in decision.reason


def test_case_4_a_lapse_from_a_background_surface_is_also_a_notification():
    decision = decide(
        snapshot(
            focus=focus(
                value=StateValue.NOT_MASTERED.value,
                previous_value=StateValue.MASTERED.value,
            ),
            source=SOURCE_API,
        )
    )
    assert decision.action is Action.NOTIFY
    assert decision.target == "线性无关"
    assert decision.urgency is Urgency.HIGH


def test_case_4_mid_learning_elsewhere_is_not_worth_interrupting_for():
    """CONTINUE means "stay on this item" — with nobody there to stay with, it
    degrades to doing nothing rather than to a notification."""
    decision = decide(
        snapshot(
            focus=focus(value=StateValue.NOT_MASTERED.value, previous_value="unassessed"),
            source=SOURCE_API,
        )
    )
    assert decision.action is Action.NO_ACTION
    assert decision.urgency is Urgency.LOW


# --- properties that hold for every decision -------------------------------


@pytest.mark.parametrize(
    "source", [SOURCE_CHAT, SOURCE_API]
)
@pytest.mark.parametrize(
    "focus_value,previous",
    [
        (StateValue.MASTERED.value, "unassessed"),
        (StateValue.NOT_MASTERED.value, StateValue.MASTERED.value),
        (StateValue.NOT_MASTERED.value, "unassessed"),
        (StateValue.UNASSESSED.value, "unassessed"),
    ],
)
def test_every_decision_is_total(source, focus_value, previous):
    """No combination of the four focus states and two sources is unhandled:
    every one produces a decision with a reason and an action from the set."""
    decision = decide(
        snapshot(
            focus=focus(value=focus_value, previous_value=previous),
            ready=("特征值",),
            source=source,
        )
    )
    assert decision.action in set(Action)
    assert decision.reason.strip()
    assert decision.urgency in set(Urgency)
    # Reasoning is never blank, and an acting decision always names its target.
    if decision.action is not Action.NO_ACTION:
        assert decision.target


def test_the_same_snapshot_always_produces_the_same_decision():
    """Determinism is the reason this layer is rules and not a model."""
    snap = snapshot(focus=focus(value=StateValue.MASTERED.value), ready=("特征值",))
    first, second = decide(snap), decide(snap)
    assert first == second


def test_urgency_is_the_documented_table():
    assert _URGENCY["lapse"] is Urgency.HIGH
    assert _URGENCY["next_step"] is Urgency.NORMAL
    assert _URGENCY["struggle"] is Urgency.NORMAL
    assert _URGENCY["unsettled"] is Urgency.LOW
    assert _URGENCY["none"] is Urgency.LOW


def test_no_decision_ever_carries_user_facing_copy():
    """The Coordinator decides; it does not write the sentence the learner
    reads. `reason` explains to a system, and the payload is machine-readable."""
    decision = decide(
        snapshot(focus=focus(value=StateValue.MASTERED.value), ready=("特征值",))
    )
    assert set(decision.payload) == {
        "eventType",
        "finding",
        "focusItemId",
        "focusItemLabel",
        "focusValue",
        "targetLabel",
    }
    assert "title" not in decision.payload and "body" not in decision.payload
