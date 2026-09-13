"""Calendar sync feature — provider registration and public API."""

from services.calendar.apple import AppleCalDAVProvider
from services.calendar.base import (
    CalendarProviderType,
    ExternalEvent,
    SyncDirection,
    SyncResult,
)
from services.calendar.google import GoogleCalendarProvider
from services.calendar.provider_registry import get_all_providers, get_provider, register_provider
from services.calendar.sync_engine import CalendarSyncEngine

# Register all providers — add one line per new provider
register_provider(GoogleCalendarProvider())
register_provider(AppleCalDAVProvider())

__all__ = [
    "CalendarSyncEngine",
    "CalendarProviderType",
    "ExternalEvent",
    "SyncDirection",
    "SyncResult",
    "get_provider",
    "get_all_providers",
]
