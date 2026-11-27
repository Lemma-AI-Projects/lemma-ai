"""Source registry (来源登记), rules layer.

The rules layer reaches a source only through the handler registered here;
it never imports a scheduler. Registration happens once per process at the
composition root (services/schedule_sources.py), in the API process and in
every Celery worker.
"""

from services.schedule.types import SourceHandler

_REGISTRY: dict[str, SourceHandler] = {}


def register_source(kind: str, handler: SourceHandler) -> None:
    """Register the handler for a source kind. Registering a different
    handler for a kind already registered is a ValueError (two wirings)."""
    raise NotImplementedError


def handler_for(kind: str) -> SourceHandler | None:
    """The registered handler, or None. During overdue processing None counts
    as that source's replan failing: its tasks stay as they are, today is not
    recorded as processed, and an error is logged."""
    raise NotImplementedError
