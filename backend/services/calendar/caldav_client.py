"""Lightweight CalDAV client for iCloud Calendar operations."""

import logging
import re
import uuid
from datetime import datetime, timezone

import httpx

from services.calendar.base import ExternalEvent, SyncResult

logger = logging.getLogger(__name__)

ICLOUD_CALENDAR_URL = "https://caldav.icloud.com"


class CalDAVClient:
    """Async CalDAV client using httpx for iCloud Calendar."""

    def __init__(self, *, username: str, password: str):
        self.username = username
        self.password = password
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self):
        self._client = httpx.AsyncClient(
            auth=(self.username, self.password),
            timeout=30,
        )
        return self

    async def __aexit__(self, *args):
        if self._client:
            await self._client.aclose()

    async def fetch_calendars(self) -> list[dict]:
        body = (
            '<?xml version="1.0" encoding="utf-8"?>'
            '<d:propfind xmlns:d="DAV:">'
            "  <d:prop>"
            "    <d:displayname/>"
            "    <d:getctag/>"
            '    <cal:calendar-description xmlns:cal="urn:ietf:params:xml:ns:caldav"/>'
            "  </d:prop>"
            "</d:propfind>"
        )
        resp = await self._client.request(
            "PROPFIND",
            f"{ICLOUD_CALENDAR_URL}/",
            content=body,
            headers={"Depth": "1", "Content-Type": "application/xml; charset=utf-8"},
        )
        resp.raise_for_status()
        return self._parse_calendar_list(resp.text)

    async def fetch_events(
        self,
        *,
        calendar_url: str,
        since: str | None = None,
        time_min: datetime | None = None,
        time_max: datetime | None = None,
    ) -> SyncResult:
        body = self._build_sync_report(since)
        resp = await self._client.request(
            "REPORT",
            f"{ICLOUD_CALENDAR_URL}{calendar_url}",
            content=body,
            headers={
                "Depth": "1",
                "Content-Type": "application/xml; charset=utf-8",
            },
        )
        resp.raise_for_status()
        events, new_ctag = self._parse_event_report(resp.text)
        return SyncResult(events=events, next_sync_token=new_ctag, has_more=False)

    async def create_event(
        self, *, calendar_url: str, event: ExternalEvent
    ) -> str:
        uid = str(uuid.uuid4())
        ics = self._event_to_ics(event, uid)
        resp = await self._client.request(
            "PUT",
            f"{ICLOUD_CALENDAR_URL}{calendar_url}/{uid}.ics",
            content=ics,
            headers={"Content-Type": "text/calendar; charset=utf-8"},
        )
        resp.raise_for_status()
        return uid

    async def update_event(
        self, *, calendar_url: str, event: ExternalEvent
    ) -> None:
        ics = self._event_to_ics(event, event.external_id)
        resp = await self._client.request(
            "PUT",
            f"{ICLOUD_CALENDAR_URL}{calendar_url}/{event.external_id}.ics",
            content=ics,
            headers={"Content-Type": "text/calendar; charset=utf-8"},
        )
        resp.raise_for_status()

    async def delete_event(
        self, *, calendar_url: str, event_url: str
    ) -> None:
        resp = await self._client.request(
            "DELETE",
            f"{ICLOUD_CALENDAR_URL}{calendar_url}/{event_url}",
        )
        resp.raise_for_status()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _parse_calendar_list(self, xml_text: str) -> list[dict]:
        hrefs = re.findall(r"<d:href>([^<]+)</d:href>", xml_text)
        names = re.findall(r"<d:displayname>([^<]+)</d:displayname>", xml_text)
        calendars = []
        for i, href in enumerate(hrefs):
            if "/calendars/" in href and href.endswith("/"):
                cal_name = names[i] if i < len(names) else href.split("/")[-2]
                calendars.append(
                    {"id": href.rstrip("/"), "name": cal_name, "selected": True}
                )
        return calendars

    def _parse_event_report(self, xml_text: str) -> tuple[list[ExternalEvent], str | None]:
        ctag_match = re.search(r"<getctag>([^<]+)</getctag>", xml_text)
        new_ctag = ctag_match.group(1) if ctag_match else None

        events = []
        ical_blocks = re.findall(
            r"BEGIN:VCALENDAR(.*?)END:VCALENDAR", xml_text, re.DOTALL
        )
        for block in ical_blocks:
            event = self._parse_ical_block(block)
            if event:
                events.append(event)
        return events, new_ctag

    @staticmethod
    def _parse_ical_block(block: str) -> ExternalEvent | None:
        uid = re.search(r"UID:(.+)", block)
        summary = re.search(r"SUMMARY:(.+)", block)
        dtstart = re.search(r"DTSTART:(.+)", block)
        dtend = re.search(r"DTEND:(.+)", block)

        if not uid or not summary or not dtstart:
            return None

        return ExternalEvent(
            external_id=uid.group(1).strip(),
            title=summary.group(1).strip(),
            start_time=CalDAVClient._parse_ical_dt(dtstart.group(1).strip()),
            end_time=(
                CalDAVClient._parse_ical_dt(dtend.group(1).strip())
                if dtend
                else datetime.now(timezone.utc)
            ),
            all_day="T" not in dtstart.group(1),
            description=(re.search(r"DESCRIPTION:(.+)", block) or [None, None])[1],
            location=(re.search(r"LOCATION:(.+)", block) or [None, None])[1],
            recurrence_rule=(re.search(r"RRULE:(.+)", block) or [None, None])[1],
            updated_at=datetime.now(timezone.utc),
        )

    @staticmethod
    def _parse_ical_dt(dt_str: str) -> datetime:
        if "T" in dt_str:
            dt_str = dt_str.replace("Z", "+00:00")
            return datetime.fromisoformat(dt_str)
        return datetime.strptime(dt_str, "%Y%m%d").replace(tzinfo=timezone.utc)

    @staticmethod
    def _event_to_ics(event: ExternalEvent, uid: str) -> str:
        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Lemma AI//Calendar Sync//EN",
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTART:{event.start_time.strftime('%Y%m%dT%H%M%SZ')}",
            f"DTEND:{event.end_time.strftime('%Y%m%dT%H%M%SZ')}",
            f"SUMMARY:{event.title}",
        ]
        if event.description:
            lines.append(f"DESCRIPTION:{event.description}")
        if event.location:
            lines.append(f"LOCATION:{event.location}")
        if event.recurrence_rule:
            lines.append(f"RRULE:{event.recurrence_rule}")
        lines.extend(["END:VEVENT", "END:VCALENDAR"])
        return "\r\n".join(lines)

    def _build_sync_report(self, since: str | None) -> str:
        if since:
            return (
                '<?xml version="1.0" encoding="utf-8"?>'
                '<cal:calendar-multiget xmlns:cal="urn:ietf:params:xml:ns:caldav" '
                'xmlns:d="DAV:">'
                "  <d:prop>"
                "    <d:getetag/>"
                "    <cal:calendar-data/>"
                "  </d:prop>"
                f"  <cal:sync-token>{since}</cal:sync-token>"
                "</cal:calendar-multiget>"
            )
        return (
            '<?xml version="1.0" encoding="utf-8"?>'
            '<cal:calendar-query xmlns:cal="urn:ietf:params:xml:ns:caldav" '
            'xmlns:d="DAV:">'
            "  <d:prop>"
            "    <d:getetag/>"
            "    <cal:calendar-data/>"
            "  </d:prop>"
            "  <cal:filter>"
            '    <comp-filter name="VCALENDAR">'
            '      <comp-filter name="VEVENT"/>'
            "    </comp-filter>"
            "  </cal:filter>"
            "</cal:calendar-query>"
        )
