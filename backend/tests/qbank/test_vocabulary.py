"""Parser output stays inside the shared frontend vocabulary, and the
security cleaning removes executable markup."""

import re
from pathlib import Path
from typing import Any

import pytest

from qbank.parser import parse_question
from qbank.parser.html import parse_fragment
from qbank.parser.vocabulary import TAG_NAMES, is_allowed_class
from qbank.xkw.types import XkwQuestionRaw
from tests.qbank.helpers import expected_names, load_expected, raw_for

_FRONTEND_SCHEMA = (
    Path(__file__).resolve().parents[3] / "frontend" / "src" / "lib" / "richHtml" / "schema.ts"
)


def _html_leaves(value: Any) -> list[str]:
    if isinstance(value, dict):
        out = [value["html"]] if isinstance(value.get("html"), str) else []
        for child in value.values():
            out.extend(_html_leaves(child))
        return out
    if isinstance(value, list):
        return [html for item in value for html in _html_leaves(item)]
    return []


def _assert_in_vocabulary(markup: str) -> None:
    root = parse_fragment(markup)
    for el in root.iter():
        if el is root or not isinstance(el.tag, str):
            continue
        assert el.tag in TAG_NAMES, f"tag <{el.tag}> outside vocabulary"
        for name in (el.get("class") or "").split():
            assert is_allowed_class(name), f"class {name!r} outside vocabulary"
        for attribute in el.attrib:
            assert not attribute.lower().startswith("on"), attribute


def test_vocabulary_matches_frontend_schema() -> None:
    if not _FRONTEND_SCHEMA.exists():
        pytest.skip("frontend checkout not present")
    source = _FRONTEND_SCHEMA.read_text("utf-8")
    frontend_tags: set[str] = set()
    for constant in ("HTML_TAG_NAMES", "MATHML_TAG_NAMES"):
        block = source.split(f"const {constant} = [")[1].split("]")[0]
        frontend_tags |= set(re.findall(r"'([a-z0-9]+)'", block))
    assert frontend_tags == set(TAG_NAMES)


@pytest.mark.parametrize("name", [n for n in expected_names() if load_expected(n).get("rawFile")])
def test_parser_output_is_inside_vocabulary(name: str) -> None:
    expected = load_expected(name)
    parsed = parse_question(raw_for(expected), question_key=expected["view"]["id"])
    for markup in _html_leaves(parsed.view) + _html_leaves(parsed.review):
        _assert_in_vocabulary(markup)


def test_cleaning_removes_executable_markup() -> None:
    stem = (
        '<div class="qml-stem" data-copyright="xkw.com-1">'
        '<p onclick="alert(1)">x<script>alert(2)</script>'
        '<img src="javascript:alert(3)"><img src="https://img.xkw.com/a.png">'
        '<iframe src="https://evil"></iframe><font color="red">kept</font>'
        '<em>hi</em></p>'
        '<div class=" qml-og"><table class="qml-og"><tr>'
        '<td>A.&nbsp;<span class="qml-op">one</span></td>'
        '<td>B.&nbsp;<span class="qml-op">two</span></td></tr></table></div></div>'
    )
    parsed = parse_question(
        XkwQuestionRaw(id="x", stem=stem, answer='<div class="qml-answer"><span class="qml-an-sq"><span class="qml-an qml-isop">A</span></span></div>'),
        question_key="q_x",
    )
    html = parsed.view["stem"]["html"]
    assert "script" not in html and "onclick" not in html and "iframe" not in html
    assert "javascript:" not in html and "data-copyright" not in html
    assert "https://img.xkw.com/a.png" in html and "kept" in html and "<font" not in html
    assert "<em>" not in html
    _assert_in_vocabulary(html)
    assert parsed.slot_map["slots"]["q_x:bk"]["reference"] == {
        "kind": "options",
        "optionIds": ["q_x:og1:A"],
    }


def test_view_never_contains_reference_answers() -> None:
    for name in expected_names():
        expected = load_expected(name)
        if not expected.get("rawFile"):
            continue
        parsed = parse_question(raw_for(expected), question_key=expected["view"]["id"])
        view_text = str(parsed.view)
        assert "referenceAnswers" not in view_text
        assert "qml-isop" not in view_text and "qml-exact" not in view_text
        assert "judge=" not in view_text
