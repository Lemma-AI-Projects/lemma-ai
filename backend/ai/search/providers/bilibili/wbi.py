"""Bilibili WBI signing — independent, toggleable module (default OFF).

The Web search endpoint currently accepts unsigned anonymous requests (verified
2026-06-19), so bili_search defaults to ``extra.wbi=false``. This module exists
so a single config flip re-enables signing if Bilibili starts enforcing it.
Algorithm (community-documented, stable):

    nav -> wbi_img.img_url / sub_url -> img_key / sub_key (filename stems)
    mixin_key = reorder(img_key + sub_key) by a fixed 64-index table, take 32
    w_rid = md5(urlencode(sorted(params + {wts})) + mixin_key)

Pure functions only (no network): BiliClient supplies the cached keys. This
module never imports client at runtime (TYPE_CHECKING only), so the package can
import in any order without a cycle.
"""

from __future__ import annotations

import hashlib
import time
import urllib.parse
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from ai.search.providers.bilibili.client import BiliClient

# Fixed 64-element reorder table (community-documented; stable across years).
_MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
    33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
    61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
    36, 20, 34, 44, 52,
]
# Characters Bilibili strips from values before signing.
_FILTER_CHARS = "!'()*"


def get_mixin_key(orig: str) -> str:
    """img_key + sub_key (concatenated) -> 32-char mixin key via the reorder table."""
    return "".join(orig[index] for index in _MIXIN_KEY_ENC_TAB)[:32]


def keys_from_nav(nav: dict[str, Any]) -> tuple[str, str]:
    """Extract (img_key, sub_key) from a /x/web-interface/nav response.

    Works anonymously: nav returns code=-101 (not logged in) but still carries
    data.wbi_img. Raises ValueError when the keys are absent (caller maps it).
    """
    wbi_img = ((nav or {}).get("data") or {}).get("wbi_img") or {}
    img_key = _stem(wbi_img.get("img_url"))
    sub_key = _stem(wbi_img.get("sub_url"))
    if not img_key or not sub_key:
        raise ValueError("bilibili nav response missing wbi_img keys")
    return img_key, sub_key


def _stem(url: str | None) -> str:
    """`https://i0.hdslb.com/bfs/wbi/<key>.png` -> `<key>`."""
    if not url:
        return ""
    return url.rsplit("/", 1)[-1].split(".", 1)[0]


def encode_wbi(
    params: dict[str, Any], mixin_key: str, *, now: int | None = None
) -> dict[str, Any]:
    """Return ``params`` with ``wts`` + ``w_rid`` added (the signed query)."""
    signed: dict[str, Any] = dict(params)
    signed["wts"] = now if now is not None else int(time.time())
    filtered = {
        key: "".join(ch for ch in str(value) if ch not in _FILTER_CHARS)
        for key, value in sorted(signed.items())
    }
    query = urllib.parse.urlencode(filtered)
    signed["w_rid"] = hashlib.md5((query + mixin_key).encode("utf-8")).hexdigest()
    return signed


async def sign(params: dict[str, Any], *, client: BiliClient) -> dict[str, Any]:
    """Convenience: fetch the (cached) WBI keys via ``client`` and sign params."""
    img_key, sub_key = await client.get_wbi_keys()
    return encode_wbi(params, get_mixin_key(img_key + sub_key))
