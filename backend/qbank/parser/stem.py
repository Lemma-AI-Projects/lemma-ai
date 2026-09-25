"""Stem structure extraction (02-试题HTML渲染说明 基本结构).

A container is a `div.qml-stem` (the question's, or a sub-question's). Inside
it we collect, without descending into nested sub-questions:
- `div.qml-sq` sub-questions (小题 / 小问 when id-container="question");
- option groups `.qml-og`, in three spellings: `table.qml-og`, a wrapper
  `div.qml-og` around the table, and `div.qml-inline.qml-og`. Options are
  `.qml-op`; when that class is missing (七选五, 接入指引/04) we fall back to
  the weak signal "td text starts with `A.`";
- answer blanks `span.qml-bk[index][size][type][sq]` (`sq` or `sq="true"`).
"""

import re
from dataclasses import dataclass, field
from typing import Literal

from lxml.etree import _Element

from qbank.parser.html import collapse, has_class, inner_html

_OPTION_LABEL = re.compile(r"^\s*([A-Z])\s*[.．、]\s*")


@dataclass
class OptionNode:
    label: str
    html: str


@dataclass
class OgNode:
    el: _Element
    layout: Literal["table", "inline", "unknown"]
    # None when options could not be identified (-> the slot is unsupported).
    options: list[OptionNode] | None
    cols: int | None


@dataclass
class BlankNode:
    el: _Element
    index: int | None
    size: int | None
    style: Literal["underline", "bracket"]
    sq: bool


@dataclass
class SqNode:
    el: _Element
    stem_el: _Element
    container: "ContainerNode"
    per_question: bool
    label_text: str | None


@dataclass
class ContainerNode:
    stem_el: _Element
    blanks: list[BlankNode] = field(default_factory=list)
    ogs: list[OgNode] = field(default_factory=list)
    sqs: list[SqNode] = field(default_factory=list)


def collect(stem_el: _Element) -> ContainerNode:
    container = ContainerNode(stem_el=stem_el)
    _walk(stem_el, container)
    return container


def _walk(el: _Element, container: ContainerNode) -> None:
    for child in el:
        if not isinstance(child.tag, str):
            continue
        if has_class(child, "qml-sq"):
            container.sqs.append(_sq(child))
        elif has_class(child, "qml-og"):
            container.ogs.append(_og(child))
        elif has_class(child, "qml-bk"):
            container.blanks.append(_blank(child))
        else:
            _walk(child, container)


def _int_attr(el: _Element, name: str) -> int | None:
    value = (el.get(name) or "").strip()
    return int(value) if value.isdigit() else None


def _blank(el: _Element) -> BlankNode:
    return BlankNode(
        el=el,
        index=_int_attr(el, "index"),
        size=_int_attr(el, "size"),
        style="bracket" if (el.get("type") or "").strip() == "bracket" else "underline",
        sq="sq" in el.attrib and (el.get("sq") or "true").strip().lower() != "false",
    )


def _sq(el: _Element) -> SqNode:
    stem_el = next(
        (child for child in el if isinstance(child.tag, str) and has_class(child, "qml-stem")),
        el,
    )
    ques_no = next(
        (node for node in stem_el.iter() if isinstance(node.tag, str) and has_class(node, "ques-no")),
        None,
    )
    label = collapse(ques_no.text_content()) if ques_no is not None else None
    if ques_no is not None:
        ques_no.drop_tree()
    return SqNode(
        el=el,
        stem_el=stem_el,
        container=collect(stem_el),
        per_question=(el.get("id-container") or "").strip() == "question",
        label_text=label or None,
    )


def _og(el: _Element) -> OgNode:
    tables = [el] if el.tag == "table" else list(el.iter("table"))
    table = tables[0] if tables else None
    if table is not None:
        layout: Literal["table", "inline", "unknown"] = "table"
    elif has_class(el, "qml-inline") or any(
        has_class(node, "qml-inline") for node in el.iter() if isinstance(node.tag, str)
    ):
        layout = "inline"
    else:
        layout = "unknown"

    ops = [node for node in el.iter() if isinstance(node.tag, str) and has_class(node, "qml-op")]
    options: list[OptionNode] | None
    if ops:
        options = [
            OptionNode(label=chr(ord("A") + index), html=inner_html(op).strip())
            for index, op in enumerate(ops)
        ]
    elif table is not None:
        options = _options_from_cells(table)
    else:
        options = None

    cols: int | None
    if table is not None:
        first_row = next(table.iter("tr"), None)
        cols = len([cell for cell in first_row if cell.tag in ("td", "th")]) if first_row is not None else None
    else:
        cols = len(options) if options else None
    return OgNode(el=el, layout=layout, options=options, cols=cols or None)


def _options_from_cells(table: _Element) -> list[OptionNode] | None:
    options: list[OptionNode] = []
    for cell in table.iter("td"):
        match = _OPTION_LABEL.match(cell.text or "")
        if not match:
            return None
        cell.text = (cell.text or "")[match.end():]
        options.append(OptionNode(label=match.group(1), html=inner_html(cell).strip()))
    expected = [chr(ord("A") + index) for index in range(len(options))]
    if not options or [option.label for option in options] != expected:
        return None
    return options
