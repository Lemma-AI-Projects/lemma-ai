"""Server grading: ports the frontend mock-grading cases (mock/question/
grading.test.ts) and covers the constructed fixtures F13–F18."""

from typing import Any

import pytest

from qbank.grading import InvalidSubmission, grade, normalize_text, text_matches
from qbank.parser import parse_question
from tests.qbank.helpers import load_constructed, load_expected, raw_for


def _slot_map_from_fixture(fixture: dict[str, Any]) -> dict[str, Any]:
    view, review = fixture["view"], fixture["review"]
    references = {entry["slotId"]: entry["answer"] for entry in review["referenceAnswers"]}
    slots = [*view["slots"], *(slot for sub in view["subQuestions"] for slot in sub["slots"])]
    groups = [*view["optionGroups"], *(og for sub in view["subQuestions"] for og in sub["optionGroups"])]
    return {
        "slots": {
            slot["id"]: {
                "mechanism": slot["mechanism"],
                "grading": slot["grading"],
                "optionGroupId": slot["optionGroupId"],
                "reference": references.get(slot["id"], {"kind": "missing"}),
            }
            for slot in slots
        },
        "optionGroups": {
            og["id"]: {"optionIds": [option["id"] for option in og["options"]], "reuse": og["reuse"]}
            for og in groups
        },
    }


def _grade_fixture(name: str, responses: dict[str, Any], *, constructed: bool = False):
    fixture = load_constructed(name) if constructed else load_expected(name)
    slot_map = _slot_map_from_fixture(fixture)
    entries = [{"slotId": slot_id, "response": responses.get(slot_id)} for slot_id in slot_map["slots"]]
    return grade(slot_map, entries, structure=fixture["view"]["structure"])


def _grade_parsed(name: str, responses: dict[str, Any]):
    expected = load_expected(name)
    parsed = parse_question(raw_for(expected), question_key=expected["view"]["id"])
    entries = [{"slotId": slot_id, "response": value} for slot_id, value in responses.items()]
    return grade(parsed.slot_map, entries, structure=parsed.structure)


def test_single_choice_correct_incorrect_unanswered() -> None:
    correct = _grade_fixture("f01ChineseIdiomSingle", {"q_f01:bk": {"kind": "choice", "optionIds": ["q_f01:og1:C"]}})
    assert correct.status == "graded" and correct.score == {"earned": 1, "total": 1}
    assert correct.slots[0].verdict == "correct"
    assert correct.slots[0].response == {"kind": "choice", "optionIds": ["q_f01:og1:C"]}
    wrong = _grade_fixture("f01ChineseIdiomSingle", {"q_f01:bk": {"kind": "choice", "optionIds": ["q_f01:og1:A"]}})
    assert wrong.slots[0].verdict == "incorrect"
    empty = _grade_fixture("f01ChineseIdiomSingle", {})
    assert empty.slots[0].verdict == "unanswered" and empty.score == {"earned": 0, "total": 1}


def test_multiple_choice_requires_exact_set() -> None:
    partial = _grade_fixture("f14MultipleChoice", {"q_f14a:bk": {"kind": "choice", "optionIds": ["q_f14a:og1:A"]}}, constructed=True)
    assert partial.slots[0].verdict == "incorrect"
    full = _grade_fixture(
        "f14MultipleChoice",
        {"q_f14a:bk": {"kind": "choice", "optionIds": ["q_f14a:og1:B", "q_f14a:og1:A"]}},
        constructed=True,
    )
    assert full.slots[0].verdict == "correct"
    unknown_select = _grade_fixture(
        "f14UnknownSelect",
        {"q_f14b:bk": {"kind": "choice", "optionIds": ["q_f14b:og1:A", "q_f14b:og1:B"]}},
        constructed=True,
    )
    assert unknown_select.slots[0].verdict == "correct"


def test_judge_by_boolean() -> None:
    result = _grade_fixture(
        "f09Judge",
        {
            "q_f09:sq1:bk1": {"kind": "judge", "value": False},
            "q_f09:sq2:bk2": {"kind": "judge", "value": False},
        },
    )
    assert [slot.verdict for slot in result.slots] == ["correct", "incorrect"]


def test_seven_choose_five_per_blank() -> None:
    result = _grade_fixture(
        "f10SevenChooseFive",
        {
            "q_f10:bk1": {"kind": "pool-assign", "optionId": "q_f10:og1:D"},
            "q_f10:bk2": {"kind": "pool-assign", "optionId": "q_f10:og1:A"},
        },
    )
    assert [slot.verdict for slot in result.slots] == [
        "correct", "incorrect", "unanswered", "unanswered", "unanswered",
    ]
    assert result.score == {"earned": 1, "total": 5}


def test_exclusive_pool_rejects_reused_option() -> None:
    result = _grade_fixture(
        "f10SevenChooseFive",
        {
            "q_f10:bk1": {"kind": "pool-assign", "optionId": "q_f10:og1:D"},
            "q_f10:bk2": {"kind": "pool-assign", "optionId": "q_f10:og1:D"},
        },
    )
    assert [slot.verdict for slot in result.slots[:2]] == ["incorrect", "incorrect"]


def test_exact_blanks_alternatives_optional_chars_case_space() -> None:
    result = _grade_fixture(
        "f11ExactBlanks",
        {
            "q_f11:bk6": {"kind": "text", "text": "journey"},
            "q_f11:bk8": {"kind": "text", "text": "atisfied"},
            "q_f11:bk9": {"kind": "text", "text": "  surprisingly "},
            "q_f11:bk10": {"kind": "text", "text": "luck"},
        },
    )
    verdicts = {slot.slot_id: slot.verdict for slot in result.slots}
    assert verdicts["q_f11:bk6"] == "correct"
    assert verdicts["q_f11:bk8"] == "correct"
    assert verdicts["q_f11:bk9"] == "correct"
    assert verdicts["q_f11:bk10"] == "incorrect"


def test_essay_is_not_graded_and_not_scored() -> None:
    result = _grade_fixture(
        "f08PoemSubquestions",
        {
            "q_f08:sq1:bk": {"kind": "choice", "optionIds": ["q_f08:sq1:og1:D"]},
            "q_f08:sq2:bk": {"kind": "essay", "text": "拟人"},
        },
    )
    assert result.status == "graded" and result.score == {"earned": 1, "total": 1}
    assert result.slots[1].verdict == "not-graded" and result.slots[1].score is None


def test_unaligned_blanks_and_raw_are_ungradable() -> None:
    blanks = _grade_fixture("f05ClassicReadingBlanks", {"q_f05:bk1": {"kind": "text", "text": "祥子"}})
    assert blanks.status == "ungradable" and blanks.slots[0].verdict == "not-graded"
    raw = _grade_fixture("f16RawMassive", {})
    assert raw.status == "ungradable" and raw.score is None and raw.slots == []


def test_implicit_essay_only_question_is_ungradable() -> None:
    result = _grade_fixture("f13ImplicitEssay", {"q_f13:bk": {"kind": "essay", "text": "v = at"}}, constructed=True)
    assert result.status == "ungradable" and result.slots[0].verdict == "not-graded"


def test_sub_question_audio_choices() -> None:
    result = _grade_fixture(
        "f15SubQuestionAudio",
        {
            "q_f15:sq1:bk": {"kind": "choice", "optionIds": ["q_f15:sq1:og1:A"]},
            "q_f15:sq2:bk": {"kind": "choice", "optionIds": ["q_f15:sq2:og1:A"]},
        },
        constructed=True,
    )
    assert [slot.verdict for slot in result.slots] == ["correct", "incorrect"]
    assert result.score == {"earned": 1, "total": 2}


def test_anomalies_unsupported_slot_is_not_graded() -> None:
    result = _grade_fixture(
        "f17Anomalies",
        {
            "q_f17:bk1": {"kind": "text", "text": "７"},
            "q_f17:bk3": {"kind": "choice", "optionIds": ["q_f17:og1:B"]},
        },
        constructed=True,
    )
    verdicts = {slot.slot_id: slot.verdict for slot in result.slots}
    assert verdicts == {"q_f17:bk1": "correct", "q_f17:bk2": "not-graded", "q_f17:bk3": "correct"}
    assert result.score == {"earned": 2, "total": 2}


def test_stale_fixture_still_grades_its_own_version() -> None:
    result = _grade_fixture(
        "f18StaleVersion",
        {"q_f18:bk": {"kind": "choice", "optionIds": ["q_f18:og1:A", "q_f18:og1:B"]}},
        constructed=True,
    )
    assert result.slots[0].verdict == "correct"


def test_parser_slot_map_grades_like_the_fixture() -> None:
    result = _grade_parsed(
        "f07Cloze",
        {"q_f07:sq1:bk": {"kind": "choice", "optionIds": ["q_f07:sq1:og1:D"]}},
    )
    assert result.score == {"earned": 1, "total": 15}
    assert _grade_parsed("f11ExactBlanks", {"q_f11:bk9": {"kind": "text", "text": "AMAZINGLY"}}).slots[8].verdict == "correct"


@pytest.mark.parametrize(
    "entries",
    [
        [{"slotId": "q_f01:nope", "response": None}],
        [{"slotId": "q_f01:bk", "response": {"kind": "text", "text": "C"}}],
        [{"slotId": "q_f01:bk", "response": {"kind": "choice", "optionIds": ["q_f02:og1:A"]}}],
        [{"slotId": "q_f01:bk", "response": None}, {"slotId": "q_f01:bk", "response": None}],
    ],
)
def test_invalid_submissions_raise(entries: list[dict[str, Any]]) -> None:
    slot_map = _slot_map_from_fixture(load_expected("f01ChineseIdiomSingle"))
    with pytest.raises(InvalidSubmission):
        grade(slot_map, entries)


def test_normalization() -> None:
    assert normalize_text("  ＡＢｃ \u3000 d ") == "abc d"
    assert text_matches("Satisfied", ["(s)atisfied"])
    assert not text_matches("satisfy", ["(s)atisfied"])
    assert text_matches("x=1", ["x=1"]) and not text_matches("x = 1", ["x=1"])
