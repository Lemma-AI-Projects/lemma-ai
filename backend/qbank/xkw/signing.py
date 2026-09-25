"""XOP request signing (接入指引/02 + the official xkw-xop-client source).

V1 (documented): hex(sha1(base64("k1=v1&k2=v2...&secret=<secret>")))
V2 (only in the official client, header Xop-Sign-V2):
    hex(hmac_sha256(key=secret, msg=base64("k1=v1&k2=v2...")))

The signed map holds Xop-App-Id / Xop-Nonce / Xop-Timestamp / xop_url, every
query parameter (empty values included) and, when the body is non-empty,
xop_body. Keys sort as plain strings (Java TreeMap order == Python sort for the
ASCII keys involved).

The doc's "special characters -> \\u003c ..." table is Gson's default
HTML-safe escaping, because the official client signs and sends the SAME body
string. We mirror that: serialize once, escape the same five characters, and
send exactly the bytes we signed.
"""

import base64
import hashlib
import hmac
import json
import time
import uuid
from dataclasses import dataclass
from typing import Any

HEADER_APP_ID = "Xop-App-Id"
HEADER_TIMESTAMP = "Xop-Timestamp"
HEADER_NONCE = "Xop-Nonce"
HEADER_SIGN_V1 = "Xop-Sign"
HEADER_SIGN_V2 = "Xop-Sign-V2"
HEADER_REQUEST_ID = "X-Request-Id"
KEY_URL = "xop_url"
KEY_BODY = "xop_body"

_GSON_ESCAPES = {
    "<": "\\u003c",
    ">": "\\u003e",
    "&": "\\u0026",
    "=": "\\u003d",
    "'": "\\u0027",
}


def serialize_body(body: Any) -> str:
    """JSON body string used for BOTH signing and sending."""
    text = json.dumps(body, ensure_ascii=False, separators=(",", ":"))
    return "".join(_GSON_ESCAPES.get(char, char) for char in text)


def _param_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    return serialize_body(value)


def canonical_string(params: dict[str, Any]) -> str:
    return "&".join(f"{key}={_param_value(params[key])}" for key in sorted(params))


def _signing_map(
    *,
    app_id: str,
    url_path: str,
    query: dict[str, Any] | None,
    body: str | None,
    timestamp: int,
    nonce: str,
) -> dict[str, Any]:
    params: dict[str, Any] = dict(query or {})
    params[HEADER_APP_ID] = app_id
    params[HEADER_NONCE] = nonce
    params[HEADER_TIMESTAMP] = str(timestamp)
    params[KEY_URL] = url_path
    if body:
        params[KEY_BODY] = body
    return params


def sign_v1(params: dict[str, Any], secret: str) -> str:
    raw = f"{canonical_string(params)}&secret={secret}"
    encoded = base64.b64encode(raw.encode("utf-8"))
    return hashlib.sha1(encoded).hexdigest()


def sign_v2(params: dict[str, Any], secret: str) -> str:
    encoded = base64.b64encode(canonical_string(params).encode("utf-8"))
    return hmac.new(secret.encode("utf-8"), encoded, hashlib.sha256).hexdigest()


@dataclass(frozen=True)
class SignedHeaders:
    headers: dict[str, str]
    request_id: str


def build_signed_headers(
    *,
    app_id: str,
    secret: str,
    url_path: str,
    query: dict[str, Any] | None = None,
    body: str | None = None,
    version: int = 1,
    timestamp: int | None = None,
    nonce: str | None = None,
) -> SignedHeaders:
    """Headers for one request. `body` must be the exact string that is sent."""
    ts = int(time.time()) if timestamp is None else timestamp
    nonce_value = nonce or uuid.uuid4().hex
    params = _signing_map(
        app_id=app_id,
        url_path=url_path,
        query=query,
        body=body,
        timestamp=ts,
        nonce=nonce_value,
    )
    request_id = uuid.uuid4().hex
    headers = {
        HEADER_APP_ID: app_id,
        HEADER_TIMESTAMP: str(ts),
        HEADER_NONCE: nonce_value,
        HEADER_REQUEST_ID: request_id,
        "Content-Type": "application/json",
    }
    if version == 2:
        headers[HEADER_SIGN_V2] = sign_v2(params, secret)
    else:
        headers[HEADER_SIGN_V1] = sign_v1(params, secret)
    return SignedHeaders(headers=headers, request_id=request_id)
