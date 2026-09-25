import json
import re
from pathlib import Path
from typing import Any

from qbank.parser.html import collapse, parse_fragment, split_ques_html
from qbank.xkw.types import XkwQuestionRaw

FIXTURES = Path(__file__).parent / "fixtures"

# Serializer noise that carries no meaning: the frontend fixtures were
# written through a DOM serializer that inserts <tbody>.
_IGNORED_TAGS = {"tbody"}


def load_expected(name: str) -> dict[str, Any]:
    return json.loads((FIXTURES / "expected" / f"{name}.json").read_text("utf-8"))


def load_constructed(name: str) -> dict[str, Any]:
    return json.loads((FIXTURES / "constructed" / f"{name}.json").read_text("utf-8"))


def expected_names() -> list[str]:
    return sorted(path.stem for path in (FIXTURES / "expected").glob("*.json"))


def raw_for(expected: dict[str, Any]) -> XkwQuestionRaw:
    meta = expected["view"]["meta"]
    parts = split_ques_html((FIXTURES / "raw" / expected["rawFile"]).read_text("utf-8"))
    return XkwQuestionRaw(
        id=meta["source"]["externalId"],
        stem=parts["stem"],
        answer=parts["answer"],
        explanation=parts["explanation"],
        source_kind=meta["source"]["sourceKind"],
        type_name=meta["typeName"],
        course_name=meta["courseName"],
    )


def html_signature(markup: str) -> dict[str, Any]:
    root = parse_fragment(markup or "")
    tags = [
        el.tag
        for el in root.iter()
        if el is not root and isinstance(el.tag, str) and el.tag not in _IGNORED_TAGS
    ]
    anchors = re.findall(r'data-(slot|og|sq)-id="([^"]+)"', markup or "")
    return {"text": collapse(root.text_content()), "anchors": anchors, "tags": tags}


def diff(expected: Any, actual: Any, path: str = "$") -> list[str]:
    """Field-level differences; HTML leaves ({"html": ...}) compare by
    signature (text + anchor order + tag sequence) instead of bytes."""
    if isinstance(expected, dict) and set(expected) == {"html"}:
        if not isinstance(actual, dict) or "html" not in actual:
            return [f"{path}: expected html leaf, got {actual!r}"]
        a, b = html_signature(expected["html"]), html_signature(actual["html"])
        return [f"{path}.{key}: {a[key]!r} != {b[key]!r}" for key in a if a[key] != b[key]]
    if isinstance(expected, dict):
        if not isinstance(actual, dict):
            return [f"{path}: expected object, got {actual!r}"]
        out: list[str] = []
        for key in sorted(set(expected) | set(actual)):
            if key == "contentVersion":
                continue
            if key not in actual:
                out.append(f"{path}.{key}: missing")
            elif key not in expected:
                out.append(f"{path}.{key}: unexpected {actual[key]!r}")
            else:
                out.extend(diff(expected[key], actual[key], f"{path}.{key}"))
        return out
    if isinstance(expected, list):
        if not isinstance(actual, list) or len(expected) != len(actual):
            return [f"{path}: length {len(expected)} != {len(actual) if isinstance(actual, list) else actual!r}"]
        out = []
        for index, (e, a) in enumerate(zip(expected, actual)):
            out.extend(diff(e, a, f"{path}[{index}]"))
        return out
    return [] if expected == actual else [f"{path}: {expected!r} != {actual!r}"]
