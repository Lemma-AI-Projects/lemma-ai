"""Explanation segments: `qml-seg[seg-name]` (分析/详解/点睛/导语, whole
question) and `qml-exps-sq` (one per sub-question, labelled in text as
"(1)题详解：" / "(1)小问详解："). The leading label text is stripped from the
content; the scope (question / sub-question / slot) is decided by the caller.
"""

import re
from dataclasses import dataclass
from typing import Literal

from lxml.etree import _Element

from qbank.parser.html import find_first_class, has_class, inner_html, strip_leading_text

_SEG_LABEL = re.compile(r"^\s*【[^】]*】\s*")
_SQ_LABEL = re.compile(r"^\s*\(\s*(\d+)\s*\)\s*((?:题|小问|小题)?详解)\s*[：:]?\s*")


@dataclass
class SegNode:
    kind: Literal["seg", "sq"]
    name: str
    html: str


def parse_explanation(root: _Element) -> list[SegNode]:
    container = find_first_class(root, "qml-explanation")
    if container is None:
        return []
    segments: list[SegNode] = []
    sq_count = 0
    for el in _segments(container):
        if has_class(el, "qml-exps-sq"):
            sq_count += 1
            match = _SQ_LABEL.match(el.text or "")
            if match:
                name = f"({match.group(1)}){match.group(2)}"
                el.text = (el.text or "")[match.end():]
            else:
                # Same fallback naming the official SDK uses (按出现顺序).
                name = f"({sq_count})题详解"
            segments.append(SegNode(kind="sq", name=name, html=inner_html(el).strip()))
        else:
            name = (el.get("seg-name") or "").strip()
            label = strip_leading_text(el, _SEG_LABEL)
            if not name and label:
                name = label.strip().strip("【】")
            segments.append(SegNode(kind="seg", name=name or "解析", html=inner_html(el).strip()))
    return segments


def _segments(container: _Element) -> list[_Element]:
    found: list[_Element] = []

    def walk(el: _Element) -> None:
        for child in el:
            if not isinstance(child.tag, str):
                continue
            if has_class(child, "qml-seg") or has_class(child, "qml-exps-sq"):
                found.append(child)
            else:
                walk(child)

    walk(container)
    return found
