"""API contract for Notifications (the Feed's items). Wire format is camelCase.

Two shapes only, because the sender has two operations:

  - `NotificationIn`  — what a caller may set: title, body, type, timestamp,
    metadata. The id and the stored time are the sender's; a caller that wants
    to date an event in the past sends `timestamp`, and one that does not gets
    "now" from the database.
  - `NotificationOut` — the item the Calendar/Feed renders, including the
    `timestamp` the feed orders by.

`type` is a plain `str` here rather than a `Literal`: the set of valid labels is
owned by the sender (`services/notification_service.NOTIFICATION_TYPES`) so that
adding one is a single edit. Pinning it into the schema would mean the same fact
in two files, and the one in the schema would be the one that lies.
"""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from services.notification_service import (
    BODY_MAX_CHARS,
    DEFAULT_TYPE,
    TITLE_MAX_CHARS,
)


class NotificationIn(BaseModel):
    """One notification to send."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    title: str = Field(min_length=1, max_length=TITLE_MAX_CHARS)
    body: str = Field(default="", max_length=BODY_MAX_CHARS)
    type: str = DEFAULT_TYPE
    # Absent -> the database's now(). Present -> honoured, for a producer
    # replaying an event that happened earlier.
    timestamp: datetime | None = None
    # Free-form: the sender stores it and renders nothing from it.
    metadata: dict[str, Any] = Field(default_factory=dict)


class NotificationOut(BaseModel):
    """A notification as it appears in the feed."""

    # `from_attributes`: the sender returns frozen dataclasses, not dicts, so the
    # API serialises `SentNotification` directly.
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    title: str
    body: str
    type: str
    timestamp: datetime
    metadata: dict[str, Any]
