"""Server-side grading of one question submission against its slot_map.

Rules (拍板 D10): every machine-gradable slot is worth 1 point; choice sets must
match exactly (no partial credit yet — the `partial` verdict is reserved);
essay / non-auto / unaligned slots are `not-graded` and never scored;
`unanswered` wins over everything except essay. Exclusive shared pools (七选五)
reject re-using one option on several blanks: every blank that shares a
duplicated option is `incorrect`.
"""

from collections import Counter
from dataclasses import dataclass, field
from typing import Any, Literal

from qbank.grading.normalize import text_matches

Verdict = Literal["correct", "incorrect", "partial", "pending", "not-graded", "unanswered"]
AttemptStatus = Literal["graded", "partially-graded", "pending", "ungradable"]

_KIND_FOR_MECHANISM = {
    "choice": "choice",
    "pool-assign": "pool-assign",
    "text": "text",
    "judge": "judge",
    "essay": "essay",
}


class InvalidSubmission(ValueError):
    """The submission does not fit the question (-> 422 invalid_submission)."""


@dataclass
class SlotGrade:
    slot_id: str
    verdict: Verdict
    response: dict[str, Any] | None
    score: dict[str, int] | None


@dataclass
class GradeResult:
    status: AttemptStatus
    score: dict[str, int] | None
    slots: list[SlotGrade] = field(default_factory=list)


def _is_empty(response: dict[str, Any] | None) -> bool:
    if not response:
        return True
    kind = response.get("kind")
    if kind == "choice":
        return not response.get("optionIds")
    if kind == "pool-assign":
        return response.get("optionId") is None
    if kind == "judge":
        return response.get("value") is None
    if kind in ("text", "essay"):
        return not str(response.get("text") or "").strip()
    return True


def validate(slot_map: dict[str, Any], responses: list[dict[str, Any]]) -> dict[str, dict[str, Any] | None]:
    """{slotId: response} after structural checks; raises InvalidSubmission."""
    slots: dict[str, Any] = slot_map.get("slots", {})
    groups: dict[str, Any] = slot_map.get("optionGroups", {})
    by_slot: dict[str, dict[str, Any] | None] = {}
    for entry in responses:
        slot_id = entry.get("slotId")
        if slot_id not in slots:
            raise InvalidSubmission(f"unknown slot {slot_id!r}")
        if slot_id in by_slot:
            raise InvalidSubmission(f"slot {slot_id!r} submitted twice")
        response = entry.get("response")
        spec = slots[slot_id]
        if response is not None:
            expected_kind = _KIND_FOR_MECHANISM.get(spec["mechanism"])
            if expected_kind is None or response.get("kind") != expected_kind:
                raise InvalidSubmission(f"slot {slot_id!r} does not accept {response.get('kind')!r}")
            option_ids = set(groups.get(spec.get("optionGroupId") or "", {}).get("optionIds", []))
            if expected_kind == "choice":
                chosen = response.get("optionIds") or []
                if not isinstance(chosen, list) or not set(chosen) <= option_ids:
                    raise InvalidSubmission(f"slot {slot_id!r} has options outside its group")
            if expected_kind == "pool-assign":
                chosen_id = response.get("optionId")
                if chosen_id is not None and chosen_id not in option_ids:
                    raise InvalidSubmission(f"slot {slot_id!r} has an option outside its pool")
        by_slot[slot_id] = response
    return by_slot


def _gradable(spec: dict[str, Any]) -> bool:
    if spec["mechanism"] == "essay" or spec.get("grading") != "auto":
        return False
    reference = spec.get("reference") or {}
    kind = reference.get("kind")
    if kind in (None, "missing", "rich"):
        return False
    if kind == "judge" and reference.get("value") is None:
        return False
    return True


def _verdict(
    spec: dict[str, Any], response: dict[str, Any] | None, *, duplicated: set[str]
) -> Verdict:
    # Neither can be answered into a gradable form, so "unanswered" would blame
    # the learner for a slot the UI never offered as an input.
    if spec["mechanism"] in ("essay", "unsupported"):
        return "not-graded"
    if _is_empty(response):
        return "unanswered"
    if not _gradable(spec) or response is None:
        return "not-graded"
    reference = spec["reference"]
    kind = reference["kind"]
    if kind == "options":
        if response["kind"] == "choice":
            chosen = list(response.get("optionIds") or [])
        else:
            option_id = response.get("optionId")
            if option_id in duplicated:
                return "incorrect"
            chosen = [option_id] if option_id else []
        return "correct" if set(chosen) == set(reference["optionIds"]) else "incorrect"
    if kind == "exact":
        if response["kind"] != "text":
            return "incorrect"
        return "correct" if text_matches(str(response.get("text") or ""), reference["accepted"]) else "incorrect"
    if kind == "judge":
        return "correct" if response.get("value") is reference["value"] else "incorrect"
    return "not-graded"


def grade(
    slot_map: dict[str, Any],
    responses: list[dict[str, Any]],
    *,
    slot_order: list[str] | None = None,
    structure: str = "parsed",
) -> GradeResult:
    """Grade one question. `slot_order` keeps result slots in view order."""
    if structure == "raw":
        return GradeResult(status="ungradable", score=None, slots=[])
    by_slot = validate(slot_map, responses)
    slots: dict[str, Any] = slot_map.get("slots", {})
    groups: dict[str, Any] = slot_map.get("optionGroups", {})

    duplicated_by_group: dict[str, set[str]] = {}
    for group_id, group in groups.items():
        if group.get("reuse") != "exclusive":
            continue
        counts = Counter(
            (by_slot.get(slot_id) or {}).get("optionId")
            for slot_id, spec in slots.items()
            if spec.get("optionGroupId") == group_id and spec["mechanism"] == "pool-assign"
        )
        duplicated_by_group[group_id] = {
            option_id for option_id, count in counts.items() if option_id and count > 1
        }

    earned = 0
    total = 0
    results: list[SlotGrade] = []
    for slot_id in slot_order or list(slots):
        spec = slots[slot_id]
        response = by_slot.get(slot_id)
        duplicated = duplicated_by_group.get(spec.get("optionGroupId") or "", set())
        verdict = _verdict(spec, response, duplicated=duplicated)
        gradable = _gradable(spec)
        if gradable:
            total += 1
            earned += 1 if verdict == "correct" else 0
        results.append(
            SlotGrade(
                slot_id=slot_id,
                verdict=verdict,
                response=None if _is_empty(response) else response,
                score={"earned": 1 if verdict == "correct" else 0, "total": 1} if gradable else None,
            )
        )
    if total == 0:
        return GradeResult(status="ungradable", score=None, slots=results)
    return GradeResult(status="graded", score={"earned": earned, "total": total}, slots=results)
