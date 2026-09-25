"""lxml helpers shared by the parser (and the fixture provider)."""

import html as html_lib
import re

import lxml.html
from lxml.etree import _Element

_WS = re.compile(r"\s+")


def parse_fragment(markup: str) -> _Element:
    """Parse an HTML fragment under a synthetic <div> root."""
    return lxml.html.fragment_fromstring(markup or "", create_parent="div")


def classes(el: _Element) -> list[str]:
    return (el.get("class") or "").split()


def has_class(el: _Element, name: str) -> bool:
    return name in classes(el)


def find_answer_container(root: _Element) -> _Element | None:
    """`div.qml-answer`, or the misspelt `qml_answers` (02 L520)."""
    found = find_first_class(root, "qml-answer")
    return found if found is not None else find_first_class(root, "qml_answers")


def find_first_class(root: _Element, name: str) -> _Element | None:
    for el in root.iter():
        if isinstance(el.tag, str) and has_class(el, name):
            return el
    return None


def inner_html(el: _Element) -> str:
    parts = [html_lib.escape(el.text, quote=False) if el.text else ""]
    for child in el:
        parts.append(lxml.html.tostring(child, encoding="unicode", with_tail=True))
    return "".join(parts)


def outer_html(el: _Element) -> str:
    return lxml.html.tostring(el, encoding="unicode", with_tail=False)


def text_of(el: _Element) -> str:
    return el.text_content()


def collapse(text: str) -> str:
    return _WS.sub(" ", text.replace("\xa0", " ")).strip()


def make_anchor(attr: str, value: str, *, class_name: str | None = None) -> _Element:
    el = lxml.html.Element("span")
    if class_name:
        el.set("class", class_name)
    el.set(attr, value)
    return el


def replace_with(old: _Element, new: _Element) -> None:
    new.tail = old.tail
    parent = old.getparent()
    if parent is not None:
        parent.replace(old, new)


def strip_leading_text(el: _Element, pattern: re.Pattern[str]) -> str | None:
    """Remove a leading label (e.g. "【分析】", "(1)题详解：") from el's first
    text run; return the matched text, or None when it isn't there."""
    text = el.text or ""
    match = pattern.match(text)
    if not match:
        return None
    el.text = text[match.end():]
    return match.group(0)


def split_ques_html(markup: str) -> dict[str, str]:
    """Split a whole `div.qml-ques` sample into the three fields XKW returns
    separately: stem / answer / explanation (outer HTML of each part)."""
    root = parse_fragment(markup)
    out = {"stem": "", "answer": "", "explanation": ""}
    stem = find_first_class(root, "qml-stem")
    if stem is not None:
        out["stem"] = outer_html(stem)
    answer = find_answer_container(root)
    if answer is not None:
        out["answer"] = outer_html(answer)
    explanation = find_first_class(root, "qml-explanation")
    if explanation is not None:
        out["explanation"] = outer_html(explanation)
    return out
