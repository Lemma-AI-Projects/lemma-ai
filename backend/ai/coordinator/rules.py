"""The Coordinator's rules — what to do, given what just happened.

Pure, deterministic, no model call. Two reasons, and they are the whole argument
for this file being small:

1. **The answer is already derivable.** `ai/knowledge/state.py` says which items
   are held, which are ready, and which just moved; a rule set over that is a
   *fact*, while an LLM asked the same question would be a *guess* dressed as a
   policy — and V0 has no evaluation harness to catch it being wrong.
2. **The tests have to test the decision, not the wording.** A rule set can be
   pinned case by case (`tests/ai/coordinator/test_rules.py`); a model cannot.

The rule table, in evaluation order:

    输入                                        → 结论 (finding)
    事件不是已知类型                              → NONE
    没有知识点 / 空间没有结构                      → NONE
    事件针对的那一项，写完仍是 unassessed           → UNSETTLED（一条判定未定案）
    该项没做对，且此前做对过                        → LAPSE（有过、现在没做出来）
    该项没做对，此前没做对过                        → STRUGGLE（还在学它）
    该项已具备，且外沿有可学项                      → NEXT_STEP(可学项[0])
    该项已具备，外沿为空                           → NONE（没有再往前的下一步）

    然后按「有没有人在场」决定送达方式：

    事件来自对话（有人正在被教）                    → LAPSE→REVIEW / STRUGGLE→CONTINUE
                                                   / NEXT_STEP→INTRODUCE
    事件来自后台（没有活跃对话）                    → LAPSE→NOTIFY / NEXT_STEP→NOTIFY
                                                   / STRUGGLE→NO_ACTION
                        （"继续做这一项"离开对话就无从执行，所以不是打扰，而是什么都不做）

Two deliberate properties:

  * `ready[0]` is the target of a `NEXT_STEP`, not "the best item". V0 has no
    ranking and will not pretend to: the outer fringe arrives in a stable order
    and the first one is as good a choice as any — saying so out loud is better
    than a score nobody can reproduce.
  * `UNSETTLED → NO_ACTION` is a *feature*, not a gap. One rubric-judged record
    does not settle an item (see `ai/knowledge/state.B_LEVEL_MIN_EVIDENCE`), and a
    Coordinator that acted on it would be reacting to noise.
"""

from __future__ import annotations

from ai.knowledge.state import StateValue

from .types import (
    SUPPORTED_EVENTS,
    Action,
    Decision,
    Finding,
    Snapshot,
    Urgency,
)

# What the finding is worth, when it is acted on at all. Fixed table: V0 has no
# ranking model, so urgency is a property of the action, not of a score.
_URGENCY: dict[Finding, Urgency] = {
    Finding.LAPSE: Urgency.HIGH,
    Finding.NEXT_STEP: Urgency.NORMAL,
    Finding.STRUGGLE: Urgency.NORMAL,
    Finding.UNSETTLED: Urgency.LOW,
    Finding.NONE: Urgency.LOW,
}

# Finding -> what to do when somebody is there to be taught.
_ACTION_IN_CONVERSATION: dict[Finding, Action] = {
    Finding.LAPSE: Action.REVIEW,
    Finding.STRUGGLE: Action.CONTINUE,
    Finding.NEXT_STEP: Action.INTRODUCE,
}

# Finding -> what to do when nobody is. STRUGGLE is absent on purpose: "stay on
# this item" has no meaning without a room, and it is not worth a notification.
_ACTION_IN_BACKGROUND: dict[Finding, Action] = {
    Finding.LAPSE: Action.NOTIFY,
    Finding.NEXT_STEP: Action.NOTIFY,
}

# Appended when the finding is delivered as a notification, so the log says why
# the action is NOTIFY rather than INTRODUCE.
_BACKGROUND_NOTE = "（没有活跃对话，改为通知送达）"


def find(snapshot: Snapshot) -> tuple[Finding, str | None, str]:
    """The finding and its target and reason — before delivery is considered.

    Exposed separately from `decide` so a test can assert "the state says X" and
    "therefore we do Y" as two claims instead of one.
    """
    if snapshot.event.type not in SUPPORTED_EVENTS:
        return Finding.NONE, None, f"不认识的事件类型：{snapshot.event.type}"

    focus = snapshot.focus
    if focus is None or not snapshot.has_state:
        return (
            Finding.NONE,
            None,
            "这个空间还没有知识结构，没有可判断的内容。",
        )

    if focus.value == StateValue.UNASSESSED.value:
        return (
            Finding.UNSETTLED,
            focus.label,
            f"「{focus.label}」这次只记到一条判定，还没定案"
            "（判定类证据需要两条独立记录）—— 现在不构成行动。",
        )

    if focus.value == StateValue.NOT_MASTERED.value:
        if focus.was_mastered:
            return (
                Finding.LAPSE,
                focus.label,
                f"「{focus.label}」此前做对过，这一次没做出来 —— 值得回头再确认一次。",
            )
        return (
            Finding.STRUGGLE,
            focus.label,
            f"「{focus.label}」还没有做对过，人还停在这一项上 —— 继续把它做出来。",
        )

    # focus.value == mastered
    if snapshot.ready:
        target = snapshot.ready[0]
        return (
            Finding.NEXT_STEP,
            target,
            f"「{focus.label}」已经具备，而「{target}」的前提都已满足 —— 可以开始学它。",
        )
    return (
        Finding.NONE,
        None,
        f"「{focus.label}」已经具备，但目前没有前提已满足的新项 —— 没有下一步可学。",
    )


def decide(snapshot: Snapshot) -> Decision:
    """The one decision this event produces. Never a loop, never a plan."""
    finding, target, reason = find(snapshot)
    urgency = _URGENCY[finding]

    if finding in (Finding.NONE, Finding.UNSETTLED):
        return Decision(
            action=Action.NO_ACTION,
            target=target,
            reason=reason,
            urgency=urgency,
            payload=_payload(snapshot, target, finding),
        )

    if snapshot.event.from_conversation:
        return Decision(
            action=_ACTION_IN_CONVERSATION[finding],
            target=target,
            reason=reason,
            urgency=urgency,
            payload=_payload(snapshot, target, finding),
        )

    action = _ACTION_IN_BACKGROUND.get(finding, Action.NO_ACTION)
    if action is Action.NO_ACTION:
        # Nobody is there to continue with, and it is not worth interrupting for.
        return Decision(
            action=Action.NO_ACTION,
            target=target,
            reason=f"{reason}{_BACKGROUND_NOTE}",
            urgency=Urgency.LOW,
            payload=_payload(snapshot, target, finding),
        )
    return Decision(
        action=action,
        target=target,
        reason=f"{reason}{_BACKGROUND_NOTE}",
        urgency=urgency,
        payload=_payload(snapshot, target, finding),
    )


def _payload(snapshot: Snapshot, target: str | None, finding: Finding) -> dict:
    """Machine-readable extras for the executor. No user-facing copy here.

    `finding` is included because the executor's wording differs between a lapse
    and a next step, and it must not have to re-derive that from the raw state.
    """
    payload: dict = {"eventType": snapshot.event.type, "finding": finding.value}
    if snapshot.focus is not None:
        payload["focusItemId"] = snapshot.focus.id
        payload["focusItemLabel"] = snapshot.focus.label
        payload["focusValue"] = snapshot.focus.value
    if target is not None:
        payload["targetLabel"] = target
    return payload


__all__ = ["decide", "find"]
