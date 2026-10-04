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
    该项已具备，外沿为空                           → NO_NEXT_STEP（结构上没有下一步）

    `NO_NEXT_STEP` 与 `NONE` 是两个值，不是两个措辞：`NONE` 说"我没法判断"，
    `NO_NEXT_STEP` 说"我判断过了，现在没有下一步可做"。把它单列出来，是因为
    "暂时没有可以开始的东西"是一个**可以被检验的结论**，而它以前和"不认识的事件"
    共用一个值 —— 于是日志与界面上都读不出区别。它不等于"学完了"：到期的复习不在
    这条链上（Scheduler 不在这里），所以它只说结构，不说这个人。

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
    MethodDecision,
    MethodSelection,
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
    Finding.NO_NEXT_STEP: Urgency.LOW,
    Finding.NONE: Urgency.LOW,
}

# Findings that produce no action wherever the event came from. `NO_NEXT_STEP`
# belongs here for the same reason `UNSETTLED` does: there is nothing to do, and
# reacting anyway would be inventing work.
_NO_ACTION: frozenset[Finding] = frozenset(
    {Finding.NONE, Finding.UNSETTLED, Finding.NO_NEXT_STEP}
)

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
        Finding.NO_NEXT_STEP,
        None,
        f"「{focus.label}」已经具备，而结构里暂时没有前提已满足的新项 —— "
        "现在没有可学的新东西（这不是「他已经学完了」，只是这个结构里没有下一步）。",
    )


def decide(snapshot: Snapshot) -> Decision:
    """The one decision this event produces. Never a loop, never a plan.

    Two questions, two tables, one row: *should we do anything* (below) and
    *who does the work* (`select_method`, further down). They are answered
    separately because they can disagree — a `CONTINUE` with
    `NO_INTERVENTION` means "keep going at this, and do not change how you are
    being taught" — and one action field cannot honestly carry both.
    """
    finding, target, reason = find(snapshot)
    urgency = _URGENCY[finding]
    method = select_method(snapshot, finding)

    if finding in _NO_ACTION:
        return Decision(
            action=Action.NO_ACTION,
            target=target,
            reason=reason,
            urgency=urgency,
            payload=_payload(snapshot, target, finding, method),
        )

    if snapshot.event.from_conversation:
        return Decision(
            action=_ACTION_IN_CONVERSATION[finding],
            target=target,
            reason=reason,
            urgency=urgency,
            payload=_payload(snapshot, target, finding, method),
        )

    action = _ACTION_IN_BACKGROUND.get(finding, Action.NO_ACTION)
    if action is Action.NO_ACTION:
        # Nobody is there to continue with, and it is not worth interrupting for.
        return Decision(
            action=Action.NO_ACTION,
            target=target,
            reason=f"{reason}{_BACKGROUND_NOTE}",
            urgency=Urgency.LOW,
            payload=_payload(snapshot, target, finding, method),
        )
    return Decision(
        action=action,
        target=target,
        reason=f"{reason}{_BACKGROUND_NOTE}",
        urgency=urgency,
        payload=_payload(snapshot, target, finding, method),
    )


def _payload(
    snapshot: Snapshot,
    target: str | None,
    finding: Finding,
    method: MethodDecision,
) -> dict:
    """Machine-readable extras for the executor. No user-facing copy here.

    `finding` is included because the executor's wording differs between a lapse
    and a next step, and it must not have to re-derive that from the raw state.

    `method` is included because "why was I taught this way" is the only reason
    a decision log exists, and a log that records the finding but not the method
    cannot answer it. It rides in the same row rather than in a column of its
    own so the two can never disagree.
    """
    payload: dict = {
        "eventType": snapshot.event.type,
        "finding": finding.value,
        "method": method.to_payload(),
    }
    if snapshot.focus is not None:
        payload["focusItemId"] = snapshot.focus.id
        payload["focusItemLabel"] = snapshot.focus.label
        payload["focusValue"] = snapshot.focus.value
    if target is not None:
        payload["targetLabel"] = target
    return payload


# --- method selection --------------------------------------------------------
#
# A second, smaller table. It answers "who does the work this turn", which is a
# different question from "should we do anything at all" above — and keeping
# them apart is the point: the first table may well say CONTINUE while this one
# says NO_INTERVENTION (keep working on it, but do not restructure how you are
# being taught right now), and collapsing them would force one of those two
# meanings to be lost.
#
# ⚠️ **This table names no method.** It reads `MethodFact` fields the snapshot
# was handed. That is not a stylistic choice: a table keyed on method *names*
# would mean adding a method edits this file, which is the thing the plugin
# shape exists to prevent (`ai/coordinator/__init__.py`: *"no methods"*).
# Selection therefore goes through declared properties, and a method with
# different properties is selected by a different branch of this table without
# anyone editing it.

#: Which findings plausibly warrant *starting* a method. Kept small on purpose:
#: a method is a promise about a stretch of work, and starting one on every
#: finding would mean a new promise每 time a piece of evidence lands — which is
#: the jitter `MethodSelection.HOLD` exists to prevent.
_SELECTABLE_FINDINGS: frozenset[Finding] = frozenset(
    {Finding.LAPSE, Finding.STRUGGLE, Finding.NEXT_STEP}
)


def select_method(snapshot: Snapshot, finding: Finding) -> MethodDecision:
    """Who does the work this turn. One of five answers, none of them a plan.

    **The order of the branches is the argument.**

    1. Nothing installed → no intervention. Not an error: a build with no
       method must still answer, and "no method" means the default turn.
    2. Nobody is learning anything → no intervention. A method is for a live
       learner; choosing one for an empty room would be planning.
    3. The finding says nothing is worth doing → no intervention. **Most turns
       land here**, and that is the design working rather than failing.
    4. The learner is stuck (`LAPSE` / `STRUGGLE`) → the method that makes him
       do something, because "讲得更清楚" is what already failed. This is the
       one place the choice is forced by a property rather than a name: among
       candidates, `needs_learner_action` is what separates "he tries" from
       "we explain again".
    5. Otherwise a new item became learnable → same choice, since a method that
       needs no action has nothing to do while the learner is being introduced
       to something.

    `START` vs `HOLD` is R4's business (it needs to know whether something is
    already running); this layer answers "what would suit", and says so.
    """
    candidates = snapshot.available_methods
    if not candidates:
        return MethodDecision(
            selection=MethodSelection.NO_INTERVENTION,
            reason="没有可用的做法 —— 这一轮按普通对话回答。",
        )
    if not snapshot.event.from_conversation:
        return MethodDecision(
            selection=MethodSelection.NO_INTERVENTION,
            reason="没有活跃对话，做法只对正在被教的人有意义。",
        )
    if finding not in _SELECTABLE_FINDINGS:
        return MethodDecision(
            selection=MethodSelection.NO_INTERVENTION,
            reason="这一轮没有值得插进来的教学动作。",
        )

    acting = [fact for fact in candidates if fact.needs_learner_action]
    chosen = (acting or candidates)[0]
    if finding is Finding.STRUGGLE:
        why = "他卡在这里了 —— 这一轮要让他自己动，不是再讲一遍。"
    elif finding is Finding.LAPSE:
        why = "他曾经做对过、这次没做出来 —— 先让他自己做一次。"
    else:
        why = "有一项刚变得可学 —— 从他动手开始，而不是从他听开始。"
    return MethodDecision(
        selection=MethodSelection.START,
        method_id=chosen.id,
        reason=why,
    ).validate(snapshot)


__all__ = ["decide", "find", "select_method"]
