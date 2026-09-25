"""The rich-HTML vocabulary the frontend renders.

Copied from frontend/src/lib/richHtml/schema.ts (tagNames + className rule).
Changing the vocabulary means changing BOTH files and re-diffing fixtures;
tests assert every parser output stays inside this set.
"""

import re

HTML_TAG_NAMES = frozenset(
    {
        "p", "br", "span", "div", "sup", "sub", "b", "i", "u", "strong",
        "img", "table", "thead", "tbody", "tfoot", "tr", "td", "th", "colgroup", "col",
        "audio", "video", "source",
    }
)

MATHML_TAG_NAMES = frozenset(
    {
        "math", "mrow", "mi", "mn", "mo", "msup", "msub", "msubsup", "mfrac", "msqrt",
        "mroot", "mtable", "mtr", "mtd", "mtext", "mspace", "mover", "munder",
        "munderover", "mstyle", "mpadded", "mphantom", "semantics", "annotation",
    }
)

TAG_NAMES = HTML_TAG_NAMES | MATHML_TAG_NAMES

# Removed together with their content (schema.ts `strip`).
STRIPPED_TAG_NAMES = frozenset(
    {
        "script", "style", "iframe", "object", "embed", "link", "meta", "base",
        "form", "input", "textarea", "select", "button", "noscript", "template",
        "svg", "canvas",
    }
)

# schema.ts allows /^qml-[a-z_-]+$/ and 'xkw-math-img'; normalize.ts maps
# slash-1 before sanitizing, so it is part of the accepted input too.
_CLASS_PATTERN = re.compile(r"^qml-[a-z_-]+$")
EXTRA_CLASS_NAMES = frozenset({"xkw-math-img", "slash-1"})

URL_ATTRIBUTES = ("src", "poster", "href")
ALLOWED_URL_SCHEMES = ("http://", "https://")


def is_allowed_class(name: str) -> bool:
    return bool(_CLASS_PATTERN.match(name)) or name in EXTRA_CLASS_NAMES
