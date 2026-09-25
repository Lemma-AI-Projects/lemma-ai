"""Answer ↔ slot alignment and the per-slot grading verdict.

The docs promise the answer's sub-questions/values correspond one-to-one with
the stem's (03 L9), but samples show that only holds for counts, not always
for meaning (名著填空: three alternative example sentences). So alignment is
allowed to fail: a failed or doubtful slot gets reference `missing`, the whole
answer block is kept as `answerFallback`, and nothing is auto-graded on it.

Pairing rules:
- with sub-questions: answer group i <-> sub-question i, value j <-> its slot j;
- without: one group <-> all top slots, or (七选五 / 机阅填空) one group per
  sub-question blank, in order.
"""

import re
from dataclasses import dataclass
from typing import Any

from qbank.parser.answer import AnNode, AnswerModel
from qbank.parser.semantics import looks_like_judge, select_for
from qbank.parser.slots import QuestionPlan, SlotPlan

_LETTERS = re.compile(r"^[A-Z]+$")


@dataclass
class SlotOutcome:
    plan: SlotPlan
    mechanism: str
    grading: str
    select: str | None
    reference: dict[str, Any]


@dataclass
class AlignmentResult:
    top: list[SlotOutcome]
    subs: list[list[SlotOutcome]]
    answer_fallback: str | None


def align(
    plan: QuestionPlan, answer: AnswerModel | None, *, type_name: str | None
) -> AlignmentResult:
    pairs = _pair(plan, answer)
    need_fallback = False

    def outcome(slot: SlotPlan) -> SlotOutcome:
        nonlocal need_fallback
        result = _resolve(slot, pairs.get(slot.id), type_name=type_name)
        if answer is not None and result.reference["kind"] == "missing":
            need_fallback = True
        return result

    top = [outcome(slot) for slot in plan.top.slots]
    subs = [[outcome(slot) for slot in sub.slots] for sub in plan.subs]
    fallback = answer.inner_html if (answer is not None and need_fallback and answer.inner_html) else None
    return AlignmentResult(top=top, subs=subs, answer_fallback=fallback)


def _pair(plan: QuestionPlan, answer: AnswerModel | None) -> dict[str, AnNode]:
    if answer is None or not answer.groups:
        return {}
    pairs: dict[str, AnNode] = {}
    groups = answer.groups
    if plan.subs:
        if len(groups) != len(plan.subs) or plan.top.slots:
            return {}
        for sub, group in zip(plan.subs, groups):
            if len(group) == len(sub.slots):
                pairs.update({slot.id: an for slot, an in zip(sub.slots, group)})
        return pairs

    slots = plan.top.slots
    if len(groups) == 1 and len(groups[0]) == len(slots):
        return {slot.id: an for slot, an in zip(slots, groups[0])}
    if len(groups) == len(slots) > 1 and all(len(group) == 1 for group in groups):
        return {slot.id: group[0] for slot, group in zip(slots, groups)}
    return {}


def _resolve(slot: SlotPlan, an: AnNode | None, *, type_name: str | None) -> SlotOutcome:
    mechanism = slot.mechanism
    missing = {"kind": "missing"}

    if mechanism in ("choice", "pool-assign"):
        options = slot.og.node.options if slot.og else None
        letters = _letters(an)
        reference: dict[str, Any] = missing
        grading = "unknown"
        if an is not None and letters and options:
            by_label = {option.label: option for option in options}
            if all(letter in by_label for letter in letters):
                og_id = slot.og.id  # type: ignore[union-attr]
                reference = {"kind": "options", "optionIds": [f"{og_id}:{letter}" for letter in letters]}
                grading = "auto"
        select = (
            select_for(type_name, len(letters) if letters else None)
            if mechanism == "choice"
            else None
        )
        return SlotOutcome(slot, mechanism, grading, select, reference)

    if mechanism == "text":
        if an is not None and an.judge is not None:
            value = {0: False, 1: True}.get(an.judge)
            grading = "auto" if value is not None else "none"
            return SlotOutcome(slot, "judge", grading, None, {"kind": "judge", "value": value})
        if an is not None and an.exact:
            accepted = [part.strip() for part in an.text.split("##") if part.strip()]
            if accepted:
                return SlotOutcome(
                    slot,
                    "text",
                    "auto",
                    None,
                    {"kind": "exact", "accepted": accepted, "display": {"html": an.html}},
                )
        is_judge = an is None and slot.blank is not None and slot.blank.style == "bracket" and looks_like_judge(type_name)
        final_mechanism = "judge" if is_judge else "text"
        # A non-exact reference for a short blank is prose (possibly "任选其一"
        # alternatives), not a per-blank key: never align or grade it.
        grading = "none" if an is not None else "unknown"
        return SlotOutcome(slot, final_mechanism, grading, None, missing)

    if mechanism == "essay":
        if an is not None and an.html:
            return SlotOutcome(slot, "essay", "none", None, {"kind": "rich", "content": {"html": an.html}})
        return SlotOutcome(slot, "essay", "none", None, missing)

    return SlotOutcome(slot, "unsupported", "unknown", None, missing)


def _letters(an: AnNode | None) -> list[str] | None:
    if an is None:
        return None
    text = an.text.replace(" ", "").replace(",", "").replace("，", "").replace("、", "")
    if not _LETTERS.match(text):
        return None
    return list(dict.fromkeys(text))
