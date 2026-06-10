"""use_case -> executable Model: a single route or a cross-platform FallbackModel.

Fallback policy (终稿 5.3): only rate limits, timeouts, network errors and 5xx
move to the next candidate. Auth errors, malformed-request 4xx and capability
mismatches abort immediately — retrying them elsewhere just burns money.

The fallback_on hook doubles as the failure-accounting tap: every failed
attempt is written to the usage ledger BEFORE the chain moves on (rules 第八章).

铁律: fallback only ever happens before the first token. Once a stream has
started, FallbackModel never re-enters another model — mid-stream failures
surface as an SSE error event (see client.py).
"""

from pydantic_ai.exceptions import ModelAPIError, ModelHTTPError
from pydantic_ai.models import Model
from pydantic_ai.models.fallback import FallbackModel

from ai.config import routes_for
from ai.model_factory import build_model
from ai.types import AIUseCase
from ai.usage import current_tracker, record_failure

# 408 request timeout / 409 conflict / 429 rate limited.
_RETRYABLE_STATUS = {408, 409, 429}


def _is_retryable(exc: Exception) -> bool:
    if isinstance(exc, ModelHTTPError):
        return exc.status_code in _RETRYABLE_STATUS or exc.status_code >= 500
    if isinstance(exc, ModelAPIError):
        # No HTTP status: connection/timeout/parse failures wrapped by the
        # framework — worth trying the other platform.
        return True
    return False


def _record_and_decide(exc: Exception) -> bool:
    """fallback_on hook: account for the failure, then tell FallbackModel
    whether to move on (True) or re-raise immediately (False)."""
    will_fallback = _is_retryable(exc)
    tracker = current_tracker()
    if tracker is not None:
        record_failure(tracker, error=exc, will_fallback=will_fallback)
    return will_fallback


def resolve(use_case: AIUseCase) -> Model:
    routes = routes_for(use_case)
    models = [build_model(route) for route in routes]
    if len(models) == 1:
        return models[0]
    return FallbackModel(models[0], *models[1:], fallback_on=_record_and_decide)
