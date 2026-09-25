"""Parser output and fixtures validate against the wire contract
(schemas/question.py), so the three stay in lock-step."""

import pytest

from qbank.parser import parse_question
from schemas.question import QuestionReview, QuestionView
from tests.qbank.helpers import expected_names, load_constructed, load_expected, raw_for


@pytest.mark.parametrize("name", [n for n in expected_names() if load_expected(n).get("rawFile")])
def test_parser_output_fits_contract(name: str) -> None:
    expected = load_expected(name)
    parsed = parse_question(raw_for(expected), question_key=expected["view"]["id"])
    view = QuestionView.model_validate(parsed.view)
    QuestionReview.model_validate(parsed.review)
    dumped = view.model_dump(by_alias=True, mode="json")
    assert dumped["id"] == parsed.view["id"]
    assert "referenceAnswers" not in str(dumped)


@pytest.mark.parametrize(
    "name",
    [*expected_names(), "f13ImplicitEssay", "f14MultipleChoice", "f15SubQuestionAudio", "f17Anomalies"],
)
def test_frontend_fixtures_fit_contract(name: str) -> None:
    fixture = load_expected(name) if name in expected_names() else load_constructed(name)
    QuestionView.model_validate(fixture["view"])
    QuestionReview.model_validate(fixture["review"])
