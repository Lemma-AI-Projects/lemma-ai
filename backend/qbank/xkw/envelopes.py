"""Response envelope normalization.

Documented shapes (all verified against the doc examples in tests):
- {code, msg, data:[...], session_id | image_ocr_text}   推题/解题方法/搜题 (04 L143)
- bare JSON array                                         相似题/举一反三 (04 L335)
- {page_index, total_page, total_size, items, page_size}  关键词搜题 (04 L1329)
- a bare object                                           试卷详情 (05 L560)
- {code: 2000000, msg, data}                              接入指引/04
`code` may be 2000000, 0 (endpoint examples) or a 900161xxx / 4xxxxxx error.
"""

import logging
from typing import Any

from qbank.xkw.errors import (
    EMPTY_NOT_BILLED,
    SUCCESS_CODES,
    XKW_MALFORMED,
    XkwError,
    code_for_http_status,
    code_for_raw,
)
from qbank.xkw.types import XkwResult

logger = logging.getLogger("lemma.qbank.xkw")

_ENVELOPE_KEYS = {"code", "msg", "data", "session_id", "image_ocr_text", "message"}


def normalize(payload: Any, *, http_status: int = 200) -> XkwResult:
    """Envelope -> XkwResult, or raise XkwError. HTTP errors win when the body
    carries no business code."""
    raw_code = _raw_code(payload)
    if raw_code is not None and raw_code == EMPTY_NOT_BILLED:
        return XkwResult(items=[], raw_code=raw_code, billable=False)
    if raw_code is not None and raw_code not in SUCCESS_CODES:
        raise XkwError(
            code_for_raw(raw_code),
            _message(payload) or f"xkw returned code {raw_code}",
            raw_code=raw_code,
            http_status=http_status,
        )
    http_error = code_for_http_status(http_status)
    if http_error is not None:
        raise XkwError(
            http_error,
            _message(payload) or f"xkw http {http_status}",
            raw_code=raw_code,
            http_status=http_status,
        )

    if isinstance(payload, list):
        return XkwResult(items=payload, raw_code=raw_code, billable=bool(payload))
    if not isinstance(payload, dict):
        raise XkwError(XKW_MALFORMED, "xkw response is not JSON object/array")

    data = payload.get("data") if "code" in payload else payload
    session_id = payload.get("session_id") if isinstance(payload, dict) else None
    if isinstance(data, list):
        _log_unknown(payload, known=_ENVELOPE_KEYS)
        return XkwResult(items=data, session_id=session_id, raw_code=raw_code)
    if isinstance(data, dict) and isinstance(data.get("items"), list):
        return XkwResult(
            items=data["items"],
            session_id=session_id or data.get("session_id"),
            page_index=data.get("page_index"),
            total_page=data.get("total_page"),
            raw_code=raw_code,
        )
    if isinstance(data, dict):
        return XkwResult(items=[data], session_id=session_id, raw_code=raw_code)
    if data is None:
        return XkwResult(items=[], session_id=session_id, raw_code=raw_code)
    raise XkwError(XKW_MALFORMED, "xkw response data has an unexpected shape")


def _raw_code(payload: Any) -> int | None:
    if not isinstance(payload, dict) or "code" not in payload:
        return None
    try:
        return int(payload["code"])
    except (TypeError, ValueError):
        return None


def _message(payload: Any) -> str | None:
    if isinstance(payload, dict):
        message = payload.get("msg") or payload.get("message")
        return str(message) if message else None
    return None


def _log_unknown(payload: dict[str, Any], *, known: set[str]) -> None:
    unknown = set(payload) - known
    if unknown:
        logger.info("xkw envelope has unknown keys: %s", sorted(unknown))
