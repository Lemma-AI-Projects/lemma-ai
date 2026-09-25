"""Parser output vs the frontend's hand-written fixtures (F01–F12).

The fixtures are the parser's test expectation (前端方案 §10.1): every
structural field must match exactly; HTML leaves match by text, anchor order
and tag sequence.
"""

import pytest

from qbank.parser import PARSER_VERSION, parse_question
from qbank.xkw.types import XkwQuestionRaw
from tests.qbank.helpers import diff, expected_names, load_expected, raw_for

_DOC_SAMPLES = [
    name for name in expected_names() if load_expected(name).get("rawFile")
]


@pytest.mark.parametrize("name", _DOC_SAMPLES)
def test_doc_sample_matches_fixture(name: str) -> None:
    expected = load_expected(name)
    parsed = parse_question(raw_for(expected), question_key=expected["view"]["id"])
    problems = diff(expected["view"], parsed.view, "view") + diff(
        expected["review"], parsed.review, "review"
    )
    assert not problems, "\n".join(problems)
    assert parsed.parse_status == "parsed"


def test_every_doc_sample_is_covered() -> None:
    assert len(_DOC_SAMPLES) == 12


def test_massive_edition_is_raw_and_keeps_answers_out_of_the_view() -> None:
    expected = load_expected("f16RawMassive")
    source = raw_for(load_expected("f04ChemistrySingle"))
    raw = XkwQuestionRaw(
        id=expected["view"]["meta"]["source"]["externalId"],
        stem=source.stem,
        answer=source.answer,
        explanation=source.explanation,
        source_kind="massive",
    )
    parsed = parse_question(raw, question_key="q_f16")
    view = parsed.view
    assert parsed.structure == "raw" and parsed.parse_status == "raw"
    assert view["slots"] == [] and view["subQuestions"] == [] and view["stem"] == {"html": ""}
    assert diff(expected["view"]["raw"]["stem"], view["raw"]["stem"]) == []
    # Deliberate deviation from the fixture: answer/explanation never ride in
    # the view (they would be visible before any submission); they move to
    # the review, delivered only with a result.
    assert view["raw"]["answer"] is None and view["raw"]["explanation"] is None
    assert parsed.review["answerFallback"] is not None
    assert parsed.review["explanation"]
    assert parsed.slot_map["slots"] == {}


def test_content_version_tracks_parser_version_and_raw_hash() -> None:
    expected = load_expected("f01ChineseIdiomSingle")
    raw = raw_for(expected)
    first = parse_question(raw, question_key="q_x")
    again = parse_question(raw, question_key="q_x")
    changed = parse_question(raw.model_copy(update={"answer": raw.answer + " "}), question_key="q_x")
    assert first.content_version == again.content_version
    assert first.content_version.startswith(f"{PARSER_VERSION}.")
    assert changed.content_version != first.content_version
    assert first.view["slots"][0]["id"] == again.view["slots"][0]["id"]


def test_missing_stem_degrades_to_raw() -> None:
    parsed = parse_question(
        XkwQuestionRaw(id="x", stem="<p>no structure</p>", answer="", explanation=""),
        question_key="q_x",
    )
    assert parsed.structure == "raw"
    assert not parsed.fully_auto_gradable


def test_fully_auto_gradable_flags() -> None:
    auto = {"f01ChineseIdiomSingle", "f04ChemistrySingle", "f06ReadingCompound", "f07Cloze",
            "f09Judge", "f10SevenChooseFive", "f11ExactBlanks"}
    for name in _DOC_SAMPLES:
        expected = load_expected(name)
        parsed = parse_question(raw_for(expected), question_key=expected["view"]["id"])
        assert parsed.fully_auto_gradable == (name in auto), name
