"""Answer extraction: qml-answer (or the misspelt qml_answers, 02 L520) >
qml-an-sq (one per sub-question; simple questions have one too) > qml-an.

Matched by class, never by tag name: the doc table says div, samples use span.
"""

from dataclasses import dataclass

from lxml.etree import _Element

from qbank.parser.html import collapse, find_answer_container, has_class, inner_html


@dataclass
class AnNode:
    isop: bool
    exact: bool
    judge: int | None
    text: str
    html: str


@dataclass
class AnswerModel:
    groups: list[list[AnNode]]
    inner_html: str


def parse_answer(root: _Element) -> AnswerModel | None:
    container = find_answer_container(root)
    if container is None:
        return None
    an_sqs = _outermost(container, "qml-an-sq")
    if an_sqs:
        groups = [[_an(el) for el in _outermost(an_sq, "qml-an")] for an_sq in an_sqs]
    else:
        loose = _outermost(container, "qml-an")
        groups = [[_an(el) for el in loose]] if loose else []
    return AnswerModel(groups=groups, inner_html=inner_html(container).strip())


def _outermost(root: _Element, class_name: str) -> list[_Element]:
    found: list[_Element] = []

    def walk(el: _Element) -> None:
        for child in el:
            if not isinstance(child.tag, str):
                continue
            if has_class(child, class_name):
                found.append(child)
            else:
                walk(child)

    walk(root)
    return found


def _an(el: _Element) -> AnNode:
    judge_raw = (el.get("judge") or "").strip()
    return AnNode(
        isop=has_class(el, "qml-isop"),
        exact=has_class(el, "qml-exact"),
        judge=int(judge_raw) if judge_raw in ("0", "1", "2") else None,
        text=collapse(el.text_content()),
        html=inner_html(el).strip(),
    )
