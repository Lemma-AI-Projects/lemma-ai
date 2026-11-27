"""Storage of schedule plans (排期计划). The only module touching
course_schedule_plans."""

import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from models.course_schedule_plan import CourseSchedulePlan
from services.course_scheduling.types import PlanInput, SchedulePlan


async def save_plan(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID, plan: PlanInput
) -> None:
    """存排期计划: the course must be the caller's (course_not_found via the
    course library). Replaces an existing plan until the course has been
    placed into the schedule; afterwards plan_locked. Start and end dates
    stay empty. Runs inside `transaction(db)`."""
    raise NotImplementedError


async def get_plan(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID
) -> SchedulePlan | None:
    """The course's plan, or None (no plan, or not the caller's course)."""
    raise NotImplementedError


async def read_plan_fresh(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID
) -> SchedulePlan | None:
    """get_plan selected by column, for reads after taking the schedule lock
    (never reuses objects the session already holds)."""
    raise NotImplementedError


async def set_dates(
    db: AsyncSession, *, course_id: uuid.UUID, start_date: date, end_date: date | None
) -> None:
    """Record 开始日 / 结束日 when the course is placed. Caller's scope."""
    raise NotImplementedError


def _to_plan(row: CourseSchedulePlan) -> SchedulePlan:
    """Row -> boundary type; rows never leave this module."""
    raise NotImplementedError
