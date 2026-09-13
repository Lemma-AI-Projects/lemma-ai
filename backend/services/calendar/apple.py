"""Apple iCloud Calendar provider via CalDAV protocol."""

import logging
from datetime import datetime

from services.calendar.base import (
    CalendarProvider,
    CalendarProviderType,
    ExternalEvent,
    SyncDirection,
    SyncResult,
)
from services.calendar.caldav_client import CalDAVClient

logger = logging.getLogger(__name__)


class AppleCalDAVProvider(CalendarProvider):
    @property
    def provider_type(self) -> CalendarProviderType:
        return CalendarProviderType.APPLE

    @property
    def supported_directions(self) -> list[SyncDirection]:
        return [SyncDirection.READ_ONLY, SyncDirection.BIDIRECTIONAL]

    async def get_auth_url(self, *, redirect_uri: str, state: str) -> str:
        return ""  # Apple has no OAuth flow

    async def exchange_token(self, *, code: str, redirect_uri: str) -> dict:
        return {}

    async def refresh_access_token(self, *, refresh_token: str) -> dict:
        return {}

    async def fetch_calendars(self, *, credentials: dict) -> list[dict]:
        async with CalDAVClient(
            username=credentials["username"],
            password=credentials["password"],
        ) as client:
            return await client.fetch_calendars()

    async def fetch_events(
        self,
        *,
        credentials: dict,
        calendar_id: str,
        since: str | None = None,
        time_min: datetime | None = None,
        time_max: datetime | None = None,
    ) -> SyncResult:
        async with CalDAVClient(
            username=credentials["username"],
            password=credentials["password"],
        ) as client:
            return await client.fetch_events(
                calendar_url=calendar_id,
                since=since,
                time_min=time_min,
                time_max=time_max,
            )

    async def create_event(
        self, *, credentials: dict, calendar_id: str, event: ExternalEvent
    ) -> str:
        async with CalDAVClient(
            username=credentials["username"],
            password=credentials["password"],
        ) as client:
            return await client.create_event(calendar_url=calendar_id, event=event)

    async def update_event(
        self, *, credentials: dict, calendar_id: str, event: ExternalEvent
    ) -> None:
        async with CalDAVClient(
            username=credentials["username"],
            password=credentials["password"],
        ) as client:
            await client.update_event(calendar_url=calendar_id, event=event)

    async def delete_event(
        self, *, credentials: dict, calendar_id: str, external_event_id: str
    ) -> None:
        async with CalDAVClient(
            username=credentials["username"],
            password=credentials["password"],
        ) as client:
            await client.delete_event(
                calendar_url=calendar_id, event_url=external_event_id
            )
