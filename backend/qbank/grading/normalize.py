"""Answer normalization for machine-gradable text blanks.

NFKC folds full-width to half-width; surrounding whitespace is dropped,
internal runs collapse to one space, and case is folded. Punctuation is kept
(it carries meaning in math answers). XKW's optional-character rule (03 L193:
`(s)atisfied` accepts both) is applied to every subject — harmless outside
English, where parentheses in an exact key are rare.
"""

import re
import unicodedata

_WS = re.compile(r"\s+")
_OPTIONAL = re.compile(r"\(([^()]*)\)")


def normalize_text(value: str) -> str:
    folded = unicodedata.normalize("NFKC", value)
    return _WS.sub(" ", folded).strip().casefold()


def _pattern(accepted: str) -> re.Pattern[str]:
    parts: list[str] = []
    last = 0
    for match in _OPTIONAL.finditer(accepted):
        parts.append(re.escape(accepted[last : match.start()]))
        parts.append(f"(?:{re.escape(match.group(1))})?")
        last = match.end()
    parts.append(re.escape(accepted[last:]))
    return re.compile(f"^{''.join(parts)}$")


def text_matches(response: str, accepted: list[str]) -> bool:
    candidate = normalize_text(response)
    return any(_pattern(normalize_text(key)).match(candidate) for key in accepted)
