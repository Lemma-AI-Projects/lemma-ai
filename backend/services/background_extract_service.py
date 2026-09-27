"""Read one public page and draft the learner's background from it.

This is the only place in the product that fetches a URL a user typed, so the
rules live here in code rather than in a review comment:

  - **http/https only, public hosts only.** The host is resolved first and every
    address it maps to must be public — loopback, private, link-local, reserved
    and multicast ranges are refused. A profile page must not become a way to
    probe the machine it runs on.
  - **Bounded.** Timeout, a declared-size ceiling, and a character ceiling on
    what reaches the model. A page is an input, not a data source.
  - **Reduced with the standard library.** No new dependency, no headless
    browser: scripts/styles/nav chrome are dropped, block tags become newlines,
    whitespace is collapsed. Good enough for prose, and it cannot execute
    anything.
  - **The output is a draft, never a write.** The caller returns it to the page,
    where the learner reads it in the text area and presses save. Nothing in this
    module touches `user_home`.
"""

import asyncio
import ipaddress
import re
import socket
import uuid
from html import unescape
from urllib.parse import urlparse

import httpx

from ai.client import ai_client
from ai.types import AIUseCase
from ai.user_profile import BackgroundDraft

#: Anything that means "this link cannot be read", carrying a message that is
#: safe to show the learner as-is.
class ExtractError(Exception):
    pass


_MAX_DECLARED_BYTES = 2_000_000
_MAX_CHARS = 12_000
_TIMEOUT_S = 12.0
_USER_AGENT = "LemmaBot/1.0 (+https://lemma.ai; reads a page you asked for)"

_TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
_DROP_RE = re.compile(
    r"<(script|style|noscript|svg|template|iframe|head)\b.*?</\1>",
    re.IGNORECASE | re.DOTALL,
)
_TAG_RE = re.compile(r"<[^>]+>")
_INLINE_WS_RE = re.compile(r"[ \t\r\f\v]+")
_BLOCK_TAGS = ("p", "div", "br", "li", "tr", "section", "article", "h1", "h2", "h3")


def _assert_public_host(host: str) -> None:
    """Refuse a host that resolves to anything but the public internet."""
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise ExtractError("这个链接打不开，检查一下网址。") from exc

    for info in infos:
        address = info[4][0]
        try:
            ip = ipaddress.ip_address(address)
        except ValueError:  # pragma: no cover - getaddrinfo always returns IPs
            continue
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            raise ExtractError("这个地址不在公网上，读不了。")


def _html_to_text(html: str) -> tuple[str, str | None]:
    """Page -> (readable text, title). No parser library, by design."""
    title: str | None = None
    title_match = _TITLE_RE.search(html)
    if title_match:
        title = unescape(_TAG_RE.sub("", title_match.group(1))).strip() or None

    body = _DROP_RE.sub(" ", html)
    for tag in _BLOCK_TAGS:
        body = re.sub(rf"</{tag}>", "\n", body, flags=re.IGNORECASE)
    text = unescape(_TAG_RE.sub(" ", body))
    text = _INLINE_WS_RE.sub(" ", text)
    text = "\n".join(line.strip() for line in text.splitlines())
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text, title


async def draft_background_from_url(
    url: str, *, user_id: uuid.UUID | None = None
) -> tuple[str, str | None]:
    """Fetch `url` and return `(draft_background, source_title)`.

    Raises `ExtractError` for everything a person can act on (bad link, page too
    big, no usable text); lets programming errors through untouched.
    """
    parsed = urlparse(url.strip())
    if parsed.scheme not in ("http", "https"):
        raise ExtractError("只支持 http 或 https 的网页链接。")
    host = parsed.hostname
    if not host:
        raise ExtractError("这个链接不完整。")

    # DNS is blocking; keep it off the event loop.
    await asyncio.to_thread(_assert_public_host, host)

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=_TIMEOUT_S,
            headers={"User-Agent": _USER_AGENT},
        ) as client:
            response = await client.get(url)
    except httpx.HTTPError as exc:
        raise ExtractError("这个链接打不开，稍后再试。") from exc

    if response.status_code >= 400:
        raise ExtractError(f"这个页面返回了 {response.status_code}，读不到内容。")

    declared = response.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > _MAX_DECLARED_BYTES:
        raise ExtractError("这个页面太大了，读不完。")
    if "html" not in response.headers.get("content-type", "").lower():
        raise ExtractError("这个链接不是网页。")

    text, title = _html_to_text(response.text)
    if len(text) < 200:
        raise ExtractError("这个页面几乎没有正文，读不出背景。")
    text = text[:_MAX_CHARS]

    heading = f"网页标题：{title}\n\n" if title else ""
    prompt = f"{heading}网页正文：\n{text}"
    draft: BackgroundDraft = await ai_client.generate(
        AIUseCase.USER_PROFILE_EXTRACT,
        prompt,
        BackgroundDraft,
        user_id=str(user_id) if user_id else None,
    )

    background = " ".join(draft.background.split())
    if not background:
        raise ExtractError("这个页面里没有读到与你的学习背景有关的内容。")
    return background, draft.source_title or title
