"""Field-normalization primitives shared by all providers.

This is the buffer against provider schema drift: durations as "mm:ss" or
"hh:mm:ss", counts with thousands separators, publish dates as epoch seconds
(Bilibili) / ISO strings / unparseable relative strings ("10 months ago"),
protocol-relative thumbnail URLs, HTML-highlighted titles. Everything returns
None rather than raising on bad input — a single odd field must never sink a
whole search.
"""

import re
from datetime import UTC, datetime
from typing import Any

_TAG_RE = re.compile(r"<[^>]+>")
# Below this an integer is plausibly a year/count, not an epoch; Bilibili
# pubdate is a 10-digit second-level timestamp, comfortably above this.
_EPOCH_MIN = 100_000_000


def strip_html(value: str | None) -> str | None:
    """Drop tags like Bilibili's <em class="keyword">…</em> search highlights."""
    if not value:
        return value
    return _TAG_RE.sub("", value)


def normalize_url(value: str | None) -> str | None:
    """Turn protocol-relative URLs (Bilibili `//i0.hdslb.com/…`) into https."""
    if not value:
        return None
    if value.startswith("//"):
        return f"https:{value}"
    return value


def pick_thumbnail(thumbnails: Any) -> str | None:
    """Best (highest-resolution) thumbnail URL from yt-dlp's ``thumbnails`` list.

    Entries are ``{"url", "width"?, "height"?, "preference"?}``; pick by pixel
    area then preference (yt-dlp's own quality hint), and pass the URL through
    normalize_url. Returns None for missing/odd input — never raises.
    """
    if not isinstance(thumbnails, list) or not thumbnails:
        return None

    def _rank(thumb: Any) -> tuple[int, int]:
        if not isinstance(thumb, dict):
            return (-1, -1)
        width = thumb.get("width") or 0
        height = thumb.get("height") or 0
        preference = thumb.get("preference") or 0
        return (int(width) * int(height), int(preference))

    best = max(thumbnails, key=_rank, default=None)
    url = best.get("url") if isinstance(best, dict) else None
    return normalize_url(url)


def parse_int(value: Any) -> int | None:
    """viewCount / play / likes -> int, tolerating "1,710,167,563" and blanks."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        cleaned = value.replace(",", "").strip()
        if not cleaned:
            return None
        try:
            return int(cleaned)
        except ValueError:
            try:
                return int(float(cleaned))
            except ValueError:
                return None
    return None


def parse_duration(value: Any) -> int | None:
    """"mm:ss" / "hh:mm:ss" -> seconds; also accepts a plain seconds number."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return int(value)
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text:
        return None
    if ":" in text:
        try:
            parts = [int(p) for p in text.split(":")]
        except ValueError:
            return None
        seconds = 0
        for part in parts:
            seconds = seconds * 60 + part
        return seconds
    try:
        return int(text)
    except ValueError:
        return None


def parse_published_at(value: Any) -> datetime | None:
    """Absolute date / ISO / epoch seconds -> datetime; relative strings -> None.

    YouTube search items carry relative dates ("10 months ago") that cannot be
    resolved to a real instant — those return None by design, never raise.
    """
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return _from_epoch(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        if text.isdigit():
            return _from_epoch(int(text))
        # ISO date / datetime (e.g. "2021-12-21", "2021-12-21T10:00:00Z").
        try:
            return datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            return None  # relative string like "10 months ago"
    return None


def _from_epoch(value: float) -> datetime | None:
    if value < _EPOCH_MIN:
        return None
    try:
        return datetime.fromtimestamp(int(value), tz=UTC)
    except (ValueError, OverflowError, OSError):
        return None
