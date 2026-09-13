"""Google Calendar provider using REST API v3."""

import logging
from datetime import datetime, timezone

import httpx

from core.calendar_config import calendar_config
from services.calendar.base import (
    CalendarProvider,
    CalendarProviderType,
    ExternalEvent,
    SyncDirection,
    SyncResult,
)

logger = logging.getLogger(__name__)

GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"
GOOGLE_OAUTH_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_OAUTH_TOKEN = "https://oauth2.googleapis.com/token"
SCOPES = ["https://www.googleapis.com/auth/calendar"]


class GoogleCalendarProvider(CalendarProvider):
    @property
    def provider_type(self) -> CalendarProviderType:
        return CalendarProviderType.GOOGLE

    @property
    def supported_directions(self) -> list[SyncDirection]:
        return [SyncDirection.READ_ONLY, SyncDirection.WRITE_ONLY, SyncDirection.BIDIRECTIONAL]

    async def get_auth_url(self, *, redirect_uri: str, state: str) -> str:
        params = {
            "client_id": calendar_config.google_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{GOOGLE_OAUTH_AUTHORIZE}?{query}"

    async def exchange_token(self, *, code: str, redirect_uri: str) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                GOOGLE_OAUTH_TOKEN,
                data={
                    "code": code,
                    "client_id": calendar_config.google_client_id,
                    "client_secret": calendar_config.google_client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "access_token": data["access_token"],
                "refresh_token": data.get("refresh_token"),
                "token_expires_at": datetime.now(timezone.utc).timestamp()
                + data.get("expires_in", 3600),
            }

    async def refresh_access_token(self, *, refresh_token: str) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                GOOGLE_OAUTH_TOKEN,
                data={
                    "refresh_token": refresh_token,
                    "client_id": calendar_config.google_client_id,
                    "client_secret": calendar_config.google_client_secret,
                    "grant_type": "refresh_token",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "access_token": data["access_token"],
                "token_expires_at": datetime.now(timezone.utc).timestamp()
                + data.get("expires_in", 3600),
            }

    async def fetch_calendars(self, *, credentials: dict) -> list[dict]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GOOGLE_CALENDAR_API}/users/me/calendarList",
                headers={"Authorization": f"Bearer {credentials['access_token']}"},
            )
            resp.raise_for_status()
            items = resp.json().get("items", [])
            return [
                {"id": c["id"], "name": c["summary"], "selected": c.get("selected", False)}
                for c in items
            ]

    async def fetch_events(
        self,
        *,
        credentials: dict,
        calendar_id: str,
        since: str | None = None,
        time_min: datetime | None = None,
        time_max: datetime | None = None,
    ) -> SyncResult:
        params: dict = {
            "singleEvents": "true",
            "orderBy": "startTime",
            "maxResults": "2500",
        }
        if since:
            params["syncToken"] = since
        if time_min:
            params["timeMin"] = time_min.isoformat()
        if time_max:
            params["timeMax"] = time_max.isoformat()

        async with httpx.AsyncClient() as client:
            all_events: list[dict] = []
            page_token = None
            next_sync = None
            while True:
                if page_token:
                    params["pageToken"] = page_token
                resp = await client.get(
                    f"{GOOGLE_CALENDAR_API}/calendars/{calendar_id}/events",
                    headers={"Authorization": f"Bearer {credentials['access_token']}"},
                    params=params,
                )
                resp.raise_for_status()
                data = resp.json()
                all_events.extend(data.get("items", []))
                page_token = data.get("nextPageToken")
                if not page_token:
                    next_sync = data.get("nextSyncToken")
                    break

        external_events = [
            ExternalEvent(
                external_id=e["id"],
                title=e.get("summary", ""),
                start_time=self._parse_datetime(e["start"]),
                end_time=self._parse_datetime(e["end"]),
                all_day="date" in e.get("start", {}),
                description=e.get("description"),
                location=e.get("location"),
                recurrence_rule=(
                    e["recurrence"][0] if e.get("recurrence") else None
                ),
                updated_at=datetime.fromisoformat(
                    e["updated"].replace("Z", "+00:00")
                ),
                is_deleted=e.get("status") == "cancelled",
            )
            for e in all_events
        ]

        return SyncResult(
            events=external_events, next_sync_token=next_sync, has_more=False
        )

    async def create_event(
        self, *, credentials: dict, calendar_id: str, event: ExternalEvent
    ) -> str:
        body = self._event_to_body(event)
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{GOOGLE_CALENDAR_API}/calendars/{calendar_id}/events",
                headers={
                    "Authorization": f"Bearer {credentials['access_token']}",
                    "Content-Type": "application/json",
                },
                json=body,
            )
            resp.raise_for_status()
            return resp.json()["id"]

    async def update_event(
        self, *, credentials: dict, calendar_id: str, event: ExternalEvent
    ) -> None:
        body = self._event_to_body(event)
        async with httpx.AsyncClient() as client:
            resp = await client.put(
                f"{GOOGLE_CALENDAR_API}/calendars/{calendar_id}/events/{event.external_id}",
                headers={
                    "Authorization": f"Bearer {credentials['access_token']}",
                    "Content-Type": "application/json",
                },
                json=body,
            )
            resp.raise_for_status()

    async def delete_event(
        self, *, credentials: dict, calendar_id: str, external_event_id: str
    ) -> None:
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{GOOGLE_CALENDAR_API}/calendars/{calendar_id}/events/{external_event_id}",
                headers={"Authorization": f"Bearer {credentials['access_token']}"},
            )
            resp.raise_for_status()

    @staticmethod
    def _parse_datetime(dt: dict) -> datetime:
        raw = dt.get("dateTime") or dt.get("date")
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        return datetime.fromisoformat(raw)

    @staticmethod
    def _event_to_body(event: ExternalEvent) -> dict:
        body: dict = {"summary": event.title}
        if event.all_day:
            body["start"] = {"date": event.start_time.strftime("%Y-%m-%d")}
            body["end"] = {"date": event.end_time.strftime("%Y-%m-%d")}
        else:
            body["start"] = {"dateTime": event.start_time.isoformat()}
            body["end"] = {"dateTime": event.end_time.isoformat()}
        if event.description:
            body["description"] = event.description
        if event.location:
            body["location"] = event.location
        if event.recurrence_rule:
            body["recurrence"] = [event.recurrence_rule]
        return body
