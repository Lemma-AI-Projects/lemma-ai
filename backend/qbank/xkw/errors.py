"""XKW error family. Two return-code schemes coexist (接入指引/04 vs each
endpoint's 900161xxx table), plus plain HTTP statuses; all map here."""

XKW_AUTH = "xkw_auth"
XKW_FORBIDDEN = "xkw_forbidden"
XKW_BAD_REQUEST = "xkw_bad_request"
XKW_NOT_FOUND = "xkw_not_found"
XKW_RATE_LIMITED = "xkw_rate_limited"
XKW_SERVER = "xkw_server"
XKW_TIMEOUT = "xkw_timeout"
XKW_MALFORMED = "xkw_malformed"
XKW_NOT_CONFIGURED = "xkw_not_configured"

RETRYABLE_CODES = frozenset({XKW_RATE_LIMITED, XKW_SERVER, XKW_TIMEOUT})
# Auth/forbidden mean bad credentials or the trial policy cut us off: retrying
# only burns quota, so they stop the call immediately and log at ERROR.
TERMINAL_ALERT_CODES = frozenset({XKW_AUTH, XKW_FORBIDDEN})

SUCCESS_CODES = frozenset({2000000, 0, 200})
EMPTY_NOT_BILLED = 900161214

_RAW_CODE_MAP: dict[int, str] = {
    4010001: XKW_AUTH,
    4010002: XKW_AUTH,
    900161401: XKW_AUTH,
    900161403: XKW_FORBIDDEN,
    4000001: XKW_BAD_REQUEST,
    900161400: XKW_BAD_REQUEST,
    900161404: XKW_NOT_FOUND,
    4040001: XKW_NOT_FOUND,
    4040002: XKW_NOT_FOUND,
    4000003: XKW_RATE_LIMITED,
    5000000: XKW_SERVER,
    5000001: XKW_SERVER,
    5000002: XKW_SERVER,
    900161500: XKW_SERVER,
    4030001: XKW_MALFORMED,
}


class XkwError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        raw_code: int | None = None,
        http_status: int | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.raw_code = raw_code
        self.http_status = http_status

    @property
    def retryable(self) -> bool:
        return self.code in RETRYABLE_CODES


def code_for_raw(raw_code: int) -> str:
    mapped = _RAW_CODE_MAP.get(raw_code)
    if mapped is not None:
        return mapped
    # "900 开头表示错误状态，最后三位是具体错误码" (04 L91): fall back on the tail.
    tail = raw_code % 1000
    if tail >= 500:
        return XKW_SERVER
    if tail in (401,):
        return XKW_AUTH
    if tail == 403:
        return XKW_FORBIDDEN
    if tail == 404:
        return XKW_NOT_FOUND
    return XKW_BAD_REQUEST


def code_for_http_status(status: int) -> str | None:
    if status >= 500:
        return XKW_SERVER
    if status == 429:
        return XKW_RATE_LIMITED
    if status == 401:
        return XKW_AUTH
    if status == 403:
        return XKW_FORBIDDEN
    if status == 404:
        return XKW_NOT_FOUND
    if status >= 400:
        return XKW_BAD_REQUEST
    return None
