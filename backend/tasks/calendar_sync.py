"""Celery task: hourly sync of all enabled calendar connections."""

import asyncio
import logging

from sqlalchemy import select

from core.database import AsyncSessionLocal
from models.calendar import CalendarConnection
from services.calendar.sync_engine import CalendarSyncEngine
from tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="calendar.sync_all", bind=True, max_retries=1)
def sync_all_calendars(self):
    asyncio.run(_sync_all())


async def _sync_all():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(CalendarConnection).where(CalendarConnection.enabled == True)  # noqa: E712
        )
        connections = result.scalars().all()

        engine = CalendarSyncEngine(db)
        for conn in connections:
            try:
                await engine.sync_connection(
                    connection_id=conn.id,
                    user_id=conn.user_id,
                )
                logger.info("Synced connection %s (%s)", conn.id, conn.provider)
            except Exception as e:
                logger.error("Failed to sync connection %s: %s", conn.id, e)
