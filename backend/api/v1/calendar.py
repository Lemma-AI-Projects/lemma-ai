"""Calendar sync API routes."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user
from models.calendar import CalendarConnection, SyncedEvent
from schemas.calendar import (
    CalendarConnectionOut,
    CalendarConnectAppleIn,
    CalendarConnectGoogleIn,
    CalendarSyncTriggerOut,
    SyncedEventOut,
)
from services.calendar import CalendarSyncEngine
from services.calendar.base import CalendarProviderType
from services.calendar.provider_registry import get_provider

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/providers")
async def list_providers():
    """List available calendar providers."""
    from services.calendar import get_all_providers

    providers = get_all_providers()
    return [
        {
            "id": pt.value,
            "name": pt.value.title(),
            "directions": [d.value for d in p.supported_directions],
        }
        for pt, p in providers.items()
    ]


@router.get("/connections")
async def list_connections(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CalendarConnectionOut]:
    engine = CalendarSyncEngine(db)
    conns = await engine.get_connections(user_id=current_user.id)
    return [CalendarConnectionOut.model_validate(c, from_attributes=True) for c in conns]


@router.get("/google/auth-url")
async def google_auth_url(
    redirect_uri: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    provider = get_provider(CalendarProviderType.GOOGLE)
    state = str(current_user.id)
    url = await provider.get_auth_url(redirect_uri=redirect_uri, state=state)
    return {"url": url}


@router.post("/google/connect")
async def google_connect(
    body: CalendarConnectGoogleIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CalendarConnectionOut:
    provider = get_provider(CalendarProviderType.GOOGLE)
    token_data = await provider.exchange_token(
        code=body.code, redirect_uri=body.redirect_uri
    )
    engine = CalendarSyncEngine(db)
    conn = await engine.connect(
        user_id=current_user.id,
        provider_type=CalendarProviderType.GOOGLE,
        credentials=token_data,
        calendar_id=body.calendar_id,
        calendar_name=body.calendar_name,
    )
    return CalendarConnectionOut.model_validate(conn, from_attributes=True)


@router.get("/apple/calendars")
async def apple_discover_calendars(
    username: str,
    password: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Validate Apple credentials and list available calendars."""
    provider = get_provider(CalendarProviderType.APPLE)
    try:
        calendars = await provider.fetch_calendars(
            credentials={"username": username, "password": password}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_apple_credentials")
    return calendars


@router.post("/apple/connect")
async def apple_connect(
    body: CalendarConnectAppleIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CalendarConnectionOut:
    engine = CalendarSyncEngine(db)
    conn = await engine.connect(
        user_id=current_user.id,
        provider_type=CalendarProviderType.APPLE,
        credentials={"username": body.username, "password": body.password},
        calendar_id=body.calendar_id,
        calendar_name=body.calendar_name,
    )
    return CalendarConnectionOut.model_validate(conn, from_attributes=True)


@router.post("/connections/{connection_id}/sync")
async def trigger_sync(
    connection_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CalendarSyncTriggerOut:
    engine = CalendarSyncEngine(db)
    result = await engine.sync_connection(
        connection_id=connection_id, user_id=current_user.id
    )
    if result["status"] == "not_found":
        raise HTTPException(status_code=404, detail="connection_not_found")
    if result["status"] == "error":
        return CalendarSyncTriggerOut(status="error", error=result.get("error"))
    return CalendarSyncTriggerOut(**result)


@router.delete("/connections/{connection_id}")
async def disconnect(
    connection_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    engine = CalendarSyncEngine(db)
    removed = await engine.disconnect(
        user_id=current_user.id, connection_id=connection_id
    )
    if not removed:
        raise HTTPException(status_code=404, detail="connection_not_found")
    return {"status": "ok"}


@router.get("/connections/{connection_id}/events")
async def list_synced_events(
    connection_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SyncedEventOut]:
    result = await db.execute(
        select(SyncedEvent)
        .join(CalendarConnection)
        .where(
            CalendarConnection.id == connection_id,
            CalendarConnection.user_id == current_user.id,
            SyncedEvent.is_deleted == False,  # noqa: E712
        )
        .order_by(SyncedEvent.start_time)
    )
    events = result.scalars().all()
    return [SyncedEventOut.model_validate(e, from_attributes=True) for e in events]
