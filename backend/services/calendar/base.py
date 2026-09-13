from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class CalendarProviderType(str, Enum):
    GOOGLE = "google"
    APPLE = "apple"


class SyncDirection(str, Enum):
    READ_ONLY = "read_only"
    WRITE_ONLY = "write_only"
    BIDIRECTIONAL = "bidirectional"


@dataclass(frozen=True)
class ExternalEvent:
    """Unified external calendar event model."""

    external_id: str
    title: str
    start_time: datetime
    end_time: datetime
    all_day: bool
    description: str | None
    location: str | None
    recurrence_rule: str | None
    updated_at: datetime
    is_deleted: bool = False


@dataclass(frozen=True)
class SyncResult:
    """Incremental sync result."""

    events: list[ExternalEvent]
    next_sync_token: str | None
    has_more: bool


class CalendarProvider(ABC):
    """Calendar provider abstraction interface."""

    @property
    @abstractmethod
    def provider_type(self) -> CalendarProviderType: ...

    @property
    @abstractmethod
    def supported_directions(self) -> list[SyncDirection]: ...

    @abstractmethod
    async def get_auth_url(self, *, redirect_uri: str, state: str) -> str: ...

    @abstractmethod
    async def exchange_token(self, *, code: str, redirect_uri: str) -> dict: ...

    @abstractmethod
    async def refresh_access_token(self, *, refresh_token: str) -> dict: ...

    @abstractmethod
    async def fetch_calendars(self, *, credentials: dict) -> list[dict]: ...

    @abstractmethod
    async def fetch_events(
        self,
        *,
        credentials: dict,
        calendar_id: str,
        since: str | None = None,
        time_min: datetime | None = None,
        time_max: datetime | None = None,
    ) -> SyncResult: ...

    @abstractmethod
    async def create_event(
        self, *, credentials: dict, calendar_id: str, event: ExternalEvent
    ) -> str: ...

    @abstractmethod
    async def update_event(
        self, *, credentials: dict, calendar_id: str, event: ExternalEvent
    ) -> None: ...

    @abstractmethod
    async def delete_event(
        self, *, credentials: dict, calendar_id: str, external_event_id: str
    ) -> None: ...

    async def validate_credentials(self, *, credentials: dict) -> bool:
        try:
            await self.fetch_calendars(credentials=credentials)
            return True
        except Exception:
            return False
