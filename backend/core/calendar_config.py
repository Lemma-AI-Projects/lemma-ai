from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class CalendarConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="CALENDAR_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:5173/auth/google/callback"

    # Sync
    calendar_sync_interval_minutes: int = 60

    # CalDAV
    apple_caldav_url: str = "https://caldav.icloud.com"


@lru_cache
def get_calendar_config() -> CalendarConfig:
    return CalendarConfig()


calendar_config = get_calendar_config()
