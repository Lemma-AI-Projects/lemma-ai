"""Stateless sync orchestrator for calendar connections."""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.calendar import CalendarConnection, SyncedEvent
from services.calendar.base import CalendarProviderType, ExternalEvent
from services.calendar.provider_registry import get_provider

logger = logging.getLogger(__name__)


class CalendarSyncEngine:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def connect(
        self,
        *,
        user_id,
        provider_type: CalendarProviderType,
        credentials: dict,
        calendar_id: str,
        calendar_name: str,
    ) -> CalendarConnection:
        provider = get_provider(provider_type)
        valid = await provider.validate_credentials(credentials=credentials)
        if not valid:
            raise ValueError("invalid_credentials")

        result = await self.db.execute(
            select(CalendarConnection).where(
                CalendarConnection.user_id == user_id,
                CalendarConnection.provider == provider_type.value,
            )
        )
        conn = result.scalar_one_or_none()

        if conn:
            conn.access_token = credentials.get("access_token", conn.access_token)
            conn.refresh_token = credentials.get("refresh_token", conn.refresh_token)
            conn.token_expires_at = credentials.get(
                "token_expires_at", conn.token_expires_at
            )
            conn.caldav_username = credentials.get("username", conn.caldav_username)
            conn.caldav_password = credentials.get("password", conn.caldav_password)
            conn.external_calendar_id = calendar_id
            conn.external_calendar_name = calendar_name
            conn.enabled = True
            conn.sync_error = None
        else:
            conn = CalendarConnection(
                user_id=user_id,
                provider=provider_type.value,
                access_token=credentials.get("access_token"),
                refresh_token=credentials.get("refresh_token"),
                token_expires_at=credentials.get("token_expires_at"),
                caldav_username=credentials.get("username"),
                caldav_password=credentials.get("password"),
                external_calendar_id=calendar_id,
                external_calendar_name=calendar_name,
                enabled=True,
            )
            self.db.add(conn)

        await self.db.commit()
        await self.db.refresh(conn)
        return conn

    async def disconnect(self, *, user_id, connection_id) -> bool:
        result = await self.db.execute(
            select(CalendarConnection).where(
                CalendarConnection.id == connection_id,
                CalendarConnection.user_id == user_id,
            )
        )
        conn = result.scalar_one_or_none()
        if not conn:
            return False
        await self.db.delete(conn)
        await self.db.commit()
        return True

    async def get_connections(self, *, user_id) -> list[CalendarConnection]:
        result = await self.db.execute(
            select(CalendarConnection).where(CalendarConnection.user_id == user_id)
        )
        return list(result.scalars().all())

    async def sync_connection(self, *, connection_id, user_id) -> dict:
        result = await self.db.execute(
            select(CalendarConnection).where(
                CalendarConnection.id == connection_id,
                CalendarConnection.user_id == user_id,
                CalendarConnection.enabled == True,  # noqa: E712
            )
        )
        conn = result.scalar_one_or_none()
        if not conn:
            return {"status": "not_found"}

        provider = get_provider(CalendarProviderType(conn.provider))
        credentials = self._build_credentials(conn)

        if conn.provider == "google" and conn.refresh_token:
            refreshed = await self._maybe_refresh_token(provider, conn)
            if not refreshed:
                return {"status": "token_expired"}

        try:
            sync_result = await provider.fetch_events(
                credentials=credentials,
                calendar_id=conn.external_calendar_id,
                since=conn.sync_token or conn.ctag,
                time_min=datetime.now(timezone.utc) - timedelta(days=30),
                time_max=datetime.now(timezone.utc) + timedelta(days=365),
            )
        except Exception as e:
            conn.sync_error = str(e)[:500]
            await self.db.commit()
            return {"status": "error", "error": str(e)}

        stats = await self._merge_events(conn, sync_result.events)

        if sync_result.next_sync_token:
            if conn.provider == "google":
                conn.sync_token = sync_result.next_sync_token
            else:
                conn.ctag = sync_result.next_sync_token

        conn.last_synced_at = datetime.now(timezone.utc)
        conn.sync_error = None
        await self.db.commit()

        return {"status": "ok", **stats}

    async def _merge_events(
        self, conn: CalendarConnection, events: list[ExternalEvent]
    ) -> dict:
        created = updated = deleted = 0

        for ext_event in events:
            result = await self.db.execute(
                select(SyncedEvent).where(
                    SyncedEvent.connection_id == conn.id,
                    SyncedEvent.external_event_id == ext_event.external_id,
                )
            )
            local = result.scalar_one_or_none()

            if ext_event.is_deleted:
                if local:
                    local.is_deleted = True
                    local.last_synced_at = datetime.now(timezone.utc)
                    deleted += 1
                continue

            if local:
                if (
                    local.title != ext_event.title
                    or local.start_time != ext_event.start_time
                    or local.end_time != ext_event.end_time
                ):
                    local.title = ext_event.title
                    local.start_time = ext_event.start_time
                    local.end_time = ext_event.end_time
                    local.description = ext_event.description
                    local.location = ext_event.location
                    local.recurrence_rule = ext_event.recurrence_rule
                    local.external_updated_at = ext_event.updated_at
                    local.last_synced_at = datetime.now(timezone.utc)
                    updated += 1
            else:
                new_event = SyncedEvent(
                    connection_id=conn.id,
                    external_event_id=ext_event.external_id,
                    title=ext_event.title,
                    start_time=ext_event.start_time,
                    end_time=ext_event.end_time,
                    all_day=ext_event.all_day,
                    description=ext_event.description,
                    location=ext_event.location,
                    recurrence_rule=ext_event.recurrence_rule,
                    external_updated_at=ext_event.updated_at,
                    last_synced_at=datetime.now(timezone.utc),
                )
                self.db.add(new_event)
                created += 1

        return {"created": created, "updated": updated, "deleted": deleted}

    def _build_credentials(self, conn: CalendarConnection) -> dict:
        if conn.provider == "google":
            return {
                "access_token": conn.access_token,
                "refresh_token": conn.refresh_token,
            }
        return {"username": conn.caldav_username, "password": conn.caldav_password}

    async def _maybe_refresh_token(self, provider, conn) -> bool:
        if not conn.token_expires_at or conn.token_expires_at > datetime.now(
            timezone.utc
        ):
            return True
        try:
            token_data = await provider.refresh_access_token(
                refresh_token=conn.refresh_token
            )
            if token_data.get("access_token"):
                conn.access_token = token_data["access_token"]
                conn.token_expires_at = token_data.get("expires_at")
                return True
        except Exception:
            pass
        return False
