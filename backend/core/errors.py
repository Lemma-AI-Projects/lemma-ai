"""Base class for business errors raised by services/ and mapped to HTTP by api/."""


class BusinessError(Exception):
    """A business refusal with a stable code the frontend can rely on.

    `code` goes out as the HTTP `detail`; `status_code` is the HTTP status the
    api layer answers with. `message` is for logs only.
    """

    def __init__(self, code: str, status_code: int, message: str = "") -> None:
        super().__init__(message or code)
        self.code = code
        self.status_code = status_code
