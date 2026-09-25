"""Slot planning: which answerable units a question has, their ids and
mechanisms, before answers are aligned.

Slot ids follow the structure path, so re-parsing the same question yields the
same ids: a blank is `bk{index}` (its qml-bk index), an implicit answer area
(a choice without a blank, or an essay) is `bk`; sub-questions prefix `sq{n}:`
and option groups are `og{n}` with options `og{n}:{A..}`. Everything is
prefixed with the question key (`q_xxx:`). 完形: the sub-question blanks live
in the shared passage but belong to their sub-question (`sq{n}:bk`).
"""

from dataclasses import dataclass
from typing import Literal

from qbank.parser.semantics import pool_reuse_for
from qbank.parser.stem import BlankNode, ContainerNode, OgNode

Mechanism = Literal["choice", "pool-assign", "text", "judge", "essay", "unsupported"]


@dataclass
class OgPlan:
    id: str
    node: OgNode
    reuse: Literal["exclusive", "allowed", "unknown"] | None


@dataclass
class SlotPlan:
    id: str
    mechanism: Mechanism
    blank: BlankNode | None
    og: OgPlan | None
    anchored: bool


@dataclass
class ContainerPlan:
    prefix: str
    node: ContainerNode
    ogs: list[OgPlan]
    slots: list[SlotPlan]


@dataclass
class QuestionPlan:
    top: ContainerPlan
    subs: list[ContainerPlan]


def plan_question(top: ContainerNode, *, key: str, type_name: str | None) -> QuestionPlan:
    top_plan = ContainerPlan(prefix=f"{key}:", node=top, ogs=[], slots=[])
    subs = [
        ContainerPlan(prefix=f"{key}:sq{index}:", node=sq.container, ogs=[], slots=[])
        for index, sq in enumerate(top.sqs, start=1)
    ]
    for plan in [top_plan, *subs]:
        plan.ogs = [
            OgPlan(id=f"{plan.prefix}og{index}", node=og, reuse=None)
            for index, og in enumerate(plan.node.ogs, start=1)
        ]

    top_blanks = list(top.blanks)
    if _is_cloze(top, subs):
        sq_blanks = [blank for blank in top_blanks if blank.sq]
        for blank, sub in zip(sq_blanks, subs, strict=True):
            og = sub.ogs[0]
            sub.slots.append(
                SlotPlan(
                    id=f"{sub.prefix}bk",
                    mechanism="choice" if og.node.options else "unsupported",
                    blank=blank,
                    og=og,
                    anchored=True,
                )
            )
        top_blanks = [blank for blank in top_blanks if not blank.sq]

    _plan_container(top_plan, top_blanks, has_subs=bool(subs), type_name=type_name)
    for sub in subs:
        if not sub.slots:
            _plan_container(sub, list(sub.node.blanks), has_subs=False, type_name=type_name)
    _dedupe_ids([top_plan, *subs])
    return QuestionPlan(top=top_plan, subs=subs)


def _is_cloze(top: ContainerNode, subs: list[ContainerPlan]) -> bool:
    if not subs:
        return False
    sq_blanks = [blank for blank in top.blanks if blank.sq]
    return len(sq_blanks) == len(subs) and all(
        len(sub.ogs) == 1 and not sub.node.blanks and not sub.node.sqs for sub in subs
    )


def _blank_id(prefix: str, blank: BlankNode, ordinal: int) -> str:
    return f"{prefix}bk{blank.index if blank.index is not None else ordinal}"


def _plan_container(
    plan: ContainerPlan, blanks: list[BlankNode], *, has_subs: bool, type_name: str | None
) -> None:
    ogs = plan.ogs
    prefix = plan.prefix
    if not ogs:
        for ordinal, blank in enumerate(blanks, start=1):
            plan.slots.append(
                SlotPlan(_blank_id(prefix, blank, ordinal), "text", blank, None, True)
            )
        if not blanks and not has_subs:
            plan.slots.append(SlotPlan(f"{prefix}bk", "essay", None, None, False))
        return

    if len(ogs) == 1:
        og = ogs[0]
        usable = og.node.options is not None
        if not blanks:
            plan.slots.append(
                SlotPlan(f"{prefix}bk", "choice" if usable else "unsupported", None, og, False)
            )
        elif len(blanks) == 1:
            plan.slots.append(
                SlotPlan(
                    _blank_id(prefix, blanks[0], 1),
                    "choice" if usable else "unsupported",
                    blanks[0],
                    og,
                    True,
                )
            )
        elif all(blank.sq for blank in blanks):
            og.reuse = pool_reuse_for(type_name)
            for ordinal, blank in enumerate(blanks, start=1):
                plan.slots.append(
                    SlotPlan(
                        _blank_id(prefix, blank, ordinal),
                        "pool-assign" if usable else "unsupported",
                        blank,
                        og,
                        True,
                    )
                )
        else:
            for ordinal, blank in enumerate(blanks, start=1):
                plan.slots.append(
                    SlotPlan(_blank_id(prefix, blank, ordinal), "unsupported", blank, None, True)
                )
        return

    # Several option groups in one container: pair them with blanks only when
    # the counts line up one-to-one; anything else is beyond what the markup
    # tells us.
    if blanks and len(blanks) == len(ogs):
        for ordinal, (blank, og) in enumerate(zip(blanks, ogs), start=1):
            mechanism: Mechanism = "choice" if og.node.options else "unsupported"
            plan.slots.append(SlotPlan(_blank_id(prefix, blank, ordinal), mechanism, blank, og, True))
        return
    for ordinal, blank in enumerate(blanks, start=1):
        plan.slots.append(
            SlotPlan(_blank_id(prefix, blank, ordinal), "unsupported", blank, None, True)
        )
    if not blanks:
        plan.slots.append(SlotPlan(f"{prefix}bk", "unsupported", None, None, False))


def _dedupe_ids(plans: list[ContainerPlan]) -> None:
    seen: set[str] = set()
    for plan in plans:
        for slot in plan.slots:
            base = slot.id
            suffix = 2
            while slot.id in seen:
                slot.id = f"{base}_{suffix}"
                suffix += 1
            seen.add(slot.id)
