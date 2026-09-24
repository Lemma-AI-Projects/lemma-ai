"""Notification Sender: the one way a notification gets into the Feed.

This module is the whole of V0's "sending". It does exactly two things:

    send(db, user_id=..., notification=...)  ->  a row in `notifications`
    list_for_user(db, user_id=..., limit=...) ->  the feed's items

Why it is small, and why it must stay small:

  * **It knows nobody.** No import from `ai/`, none from any domain service, and
    nothing about Learn Space, Learner State, methods or scheduling. A future
    Scheduler / Coordinator / Global Agent calls `send()` and hands over text;
    the sender does not reach back. That one-way edge is what keeps the delivery
    path from being entangled with the decision path — see
    `tests/services/test_notifications.py::test_the_sender_knows_nobody`, which
    fails if anyone ever imports the domain in here.
  * **`send()` is the only writer.** Nothing outside this module inserts into
    `notifications`; a Scheduler that writes feed rows itself would be a second
    definition of "what the learner was told", and the feed would drift from it.

Channels: V0 has two — the in-app Feed and the browser notification.

  * The Feed channel IS this module: the row it writes is the item the Calendar
    page renders. Persisting first is the point — a notification that only
    existed as a toast would be gone on reload.
  * The browser channel cannot live here: it is `new Notification(...)` in the
    learner's browser. It is a client concern and it lives in the frontend
    (`features/notifications/notificationSender.ts`), where it is fired
    best-effort after this call succeeds. A denied permission must not stop the
    feed row, and it cannot fail here at all.

Not implemented on purpose (V0): scheduling, ranking, deduplication, read state,
retries, delivery tracking, email/push. `send()` either writes the row or raises.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.notification import Notification

# The labels the feed can style. A closed set on purpose: `type` drives the
# item's icon and tint in the Calendar, and a sender inventing "urgent_review"
# on a Friday would render as an unstyled row nobody designed. Adding a type
# here is a two-line change, which is cheaper than a typo nobody notices.
TYPE_REMINDER = "reminder"
TYPE_NOTIFICATION = "notification"
TYPE_SYSTEM = "system"
NOTIFICATION_TYPES = (TYPE_REMINDER, TYPE_NOTIFICATION, TYPE_SYSTEM)
DEFAULT_TYPE = TYPE_REMINDER

# A notification is a card in a feed, not a message from a person. The caps
# exist so a runaway model writing an essay cannot make the Calendar unusable;
# they are generous enough that honest content never notices them.
TITLE_MAX_CHARS = 120
BODY_MAX_CHARS = 600


class InvalidNotification(ValueError):
    """A notification the sender refuses to send.

    Raised, never silently repaired: an empty title or an unknown type means the
    caller is broken, and a feed item with a blank name is worse than an error
    the caller can see.
    """


@dataclass(frozen=True)
class NotificationInput:
    """What a caller hands to `send()` — the notification's content.

    Mirrors the receiver's minimal shape: id and stored time are assigned by the
    sender, not by the caller. `metadata` is a free-form bag for structured
    context a future producer wants to attach ("which knowledge item", "which
    space"); V0 stores it verbatim and renders none of it.
    """

    title: str
    body: str = ""
    type: str = DEFAULT_TYPE
    timestamp: datetime | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class SentNotification:
    """A notification that exists, as the API and the frontend see it."""

    id: uuid.UUID
    title: str
    body: str
    type: str
    timestamp: datetime
    metadata: dict[str, Any]


def _clean(value: str, *, limit: int) -> str:
    return value.strip()[:limit]


async def send(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    notification: NotificationInput,
) -> SentNotification:
    """The one call: deliver a notification to the learner's feed.

    This is the entry point every future producer uses — a Scheduler deciding
    "she should revisit eigenvectors", a Coordinator reacting to a finished
    lesson, the Global Agent surfacing something it noticed. None of them touch
    the table or this module's internals; they build a `NotificationInput` and
    call this function (over HTTP: `POST /api/v1/notifications`).

    Delivery is the Feed insert. The browser channel is fired by the client
    after this returns, so a learner who denied notifications still gets the feed
    item — the two channels are independent, and the Feed one is authoritative.
    """
    if notification.type not in NOTIFICATION_TYPES:
        raise InvalidNotification(f"unknown notification type: {notification.type}")

    title = _clean(notification.title, limit=TITLE_MAX_CHARS)
    if not title:
        raise InvalidNotification("notification title is empty")

    row = Notification(
        user_id=user_id,
        title=title,
        body=_clean(notification.body, limit=BODY_MAX_CHARS),
        type=notification.type,
        meta=dict(notification.metadata or {}),
    )
    # An explicit timestamp is honoured so a producer replaying an event can date
    # it in the past; `now()` is the database's own default, which keeps the
    # feed's clock in one place when nobody asks for anything else.
    if notification.timestamp is not None:
        row.created_at = notification.timestamp

    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_sent(row)


async def list_for_user(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    limit: int = 50,
) -> list[SentNotification]:
    """This user's notifications, newest first — the Feed's read.

    One user's own items only; there is no "all users" read in V0 and no filter
    by type, because the Calendar shows everything it was told.
    """
    rows = (
        (
            await db.execute(
                select(Notification)
                .where(Notification.user_id == user_id)
                .order_by(Notification.created_at.desc())
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )
    return [_to_sent(row) for row in rows]


def _to_sent(row: Notification) -> SentNotification:
    """Row -> the object the API serialises. Explicit because the ORM attribute
    for `metadata` is `meta` (the name is reserved on a declarative class)."""
    return SentNotification(
        id=row.id,
        title=row.title,
        body=row.body,
        type=row.type,
        timestamp=row.created_at,
        metadata=dict(row.meta or {}),
    )


__all__ = [
    "BODY_MAX_CHARS",
    "DEFAULT_TYPE",
    "InvalidNotification",
    "NOTIFICATION_TYPES",
    "NotificationInput",
    "SentNotification",
    "TITLE_MAX_CHARS",
    "TYPE_NOTIFICATION",
    "TYPE_REMINDER",
    "TYPE_SYSTEM",
    "list_for_user",
    "send",
]
