"""Security-side cleaning (the backend's half of the two-layer defence).

Removes executable / embedding markup, event handlers, non-http(s) URLs and
the XKW copyright watermark, and unwraps tags outside the shared vocabulary.
Styling is left alone: the frontend's normalize step owns presentation.
"""

from lxml.etree import _Comment, _Element, _ProcessingInstruction

from qbank.parser.vocabulary import (
    ALLOWED_URL_SCHEMES,
    STRIPPED_TAG_NAMES,
    TAG_NAMES,
    URL_ATTRIBUTES,
)

_DROPPED_ATTRIBUTES = ("data-copyright",)


def clean_tree(root: _Element) -> None:
    """Clean root's descendants in place (root itself is the synthetic wrapper)."""
    for el in list(root.iter()):
        if el is root:
            continue
        if isinstance(el, (_Comment, _ProcessingInstruction)):
            _remove_keep_tail(el)
            continue
        if not isinstance(el.tag, str):
            continue
        tag = el.tag.lower()
        if tag in STRIPPED_TAG_NAMES:
            el.drop_tree()
            continue
        _clean_attributes(el)
        if tag == "em":
            # Keyword-search highlight, not the 着重号 (that is span[em]).
            el.tag = "span"
        elif tag not in TAG_NAMES:
            el.drop_tag()


def _clean_attributes(el: _Element) -> None:
    for name in list(el.attrib):
        lower = name.lower()
        if lower.startswith("on") or lower in _DROPPED_ATTRIBUTES:
            del el.attrib[name]
            continue
        if lower in URL_ATTRIBUTES:
            value = (el.attrib[name] or "").strip()
            if not value.lower().startswith(ALLOWED_URL_SCHEMES):
                del el.attrib[name]


def _remove_keep_tail(node: _Element) -> None:
    parent = node.getparent()
    if parent is None:
        return
    tail = node.tail or ""
    previous = node.getprevious()
    if previous is not None:
        previous.tail = (previous.tail or "") + tail
    else:
        parent.text = (parent.text or "") + tail
    parent.remove(node)
