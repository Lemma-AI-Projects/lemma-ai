"""Notification REST endpoints: the Feed's notifications, read and sent.

Two surfaces, both scoped to the caller:

  - `GET  /notifications` → the caller's notifications, newest first. This is
    what the Calendar/Feed page polls; it is deliberately NOT a notification
    centre — no counts, no unread filter, no pagination. The feed shows what it
    was told.
  - `POST /notifications` → `send()`, over HTTP. In V0 the only caller is the
    dev-only "Send test notification" button on the Schedule page, which is
    exactly the point: the sender can be exercised without a Scheduler. When a
    real producer arrives it is more likely to call
    `services.notification_service.send()` in-process (it already holds a
    session) than to call itself over HTTP — this endpoint does not become the
    Scheduler's interface by accident.

Ownership is not a parameter anywhere: the user comes from the token, so a
caller cannot send to, or read, somebody else's feed.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user
from schemas.notification import NotificationIn, NotificationOut
from services import notification_service
from services.notification_service import InvalidNotification

router = APIRouter(prefix="/notifications", tags=["notifications"])

# The feed shows recent history; 100 is a page a person scrolls, not an archive.
_LIST_LIMIT_MAX = 100


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    limit: int = Query(default=50, ge=1, le=_LIST_LIMIT_MAX),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[NotificationOut]:
    """The caller's notifications, newest first."""
    sent = await notification_service.list_for_user(
        db, user_id=current_user.id, limit=limit
    )
    return [NotificationOut.model_validate(item) for item in sent]


@router.post("", response_model=NotificationOut, status_code=status.HTTP_201_CREATED)
async def send_notification(
    payload: NotificationIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationOut:
    """Send one notification to the caller's own feed.

    422 for a payload the sender refuses (blank title, unknown type): that is a
    caller bug and the caller has to see it, not have it silently dropped.
    """
    try:
        sent = await notification_service.send(
            db,
            user_id=current_user.id,
            notification=notification_service.NotificationInput(
                title=payload.title,
                body=payload.body,
                type=payload.type,
                timestamp=payload.timestamp,
                metadata=payload.metadata,
            ),
        )
    except InvalidNotification as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    return NotificationOut.model_validate(sent)
