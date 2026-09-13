"""Calendar sync API schemas."""

from datetime import datetime

from pydantic import BaseModel
from pydantic.alias_generators import to_camel


class CalendarConnectGoogleIn(BaseModel):
    code: str
    redirect_uri: str
    calendar_id: str
    calendar_name: str


class CalendarConnectAppleIn(BaseModel):
    username: str
    password: str
    calendar_id: str
    calendar_name: str


class CalendarConnectionOut(BaseModel):
    id: str
    provider: str
    enabled: bool
    sync_direction: str
    external_calendar_name: str | None
    last_synced_at: datetime | None
    sync_error: str | None
    created_at: datetime

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class CalendarSyncTriggerOut(BaseModel):
    status: str
    created: int = 0
    updated: int = 0
    deleted: int = 0
    error: str | None = None


class SyncedEventOut(BaseModel):
    id: str
    title: str
    start_time: datetime
    end_time: datetime
    all_day: bool
    description: str | None
    location: str | None
    provider: str
    external_event_id: str

    model_config = {"alias_generator": to_camel, "populate_by_name": True}
