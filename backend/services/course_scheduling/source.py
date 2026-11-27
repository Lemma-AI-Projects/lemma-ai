"""The "course" source the scheduler registers with the schedule rules layer:
核对进度 and 重排. The rules layer calls these with its own session, inside
its transaction scope, schedule lock and a savepoint per source."""

import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from services.schedule import ItemProgress


class CourseSource:
    """SourceHandler for source kind "course" (source id = course id)."""

    async def reconcile_progress(
        self, db: AsyncSession, *, user_id: uuid.UUID, source_id: str
    ) -> list[ItemProgress]:
        """核对进度: each lesson's completed points ÷ its points, from the
        classroom. The classroom isn't designed yet, so there is no source of
        truth to report from."""
        raise NotImplementedError

    async def replan(
        self, db: AsyncSession, *, user_id: uuid.UUID, source_id: str, today: date
    ) -> None:
        """重排: the course's unfinished tasks in order, each weighing
        weight × (1 − progress); load from today on excluding this course;
        plan_dates from today to the plan's end date (an end date already
        passed counts as none); apply with one move_tasks batch."""
        raise NotImplementedError


def register_as_schedule_source() -> None:
    """Register CourseSource under COURSE_SOURCE_KIND with the rules layer.
    Called once per process by services/schedule_sources.py."""
    raise NotImplementedError
