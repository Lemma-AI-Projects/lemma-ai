"""试排, 排进日程, 撤走任务.

Reads lessons through the course library's public queries and load through
the schedule rules layer; writes tasks only through the schedule book's
actions. Never locks or writes course library rows while holding the
schedule lock.
"""

import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from services.course_scheduling.types import LessonDate


async def preview(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID, today: date
) -> list[LessonDate]:
    """试排: start = today, end from the period counted from today, the
    (possibly unconfirmed) syllabus, load from today on. Writes nothing.
    Empty when the course has no plan or no syllabus yet."""
    raise NotImplementedError


async def place_into_schedule(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID, today: date
) -> None:
    """排进日程, one transaction scope, in this order:

    1. take the user's schedule lock;
    2. read the plan fresh; none -> return;
    3. read the course: missing -> course_not_found, deleted ->
       course_deleted, not confirmed -> course_not_confirmed;
    4. the course already has tasks -> return (calling twice is harmless);
    5. read the syllabus and the load from today on, compute the dates;
    6. place one task per lesson and record start / end dates.

    The course check comes after the lock so it cannot interleave with a
    concurrent deletion: if this runs first, the deletion (which takes the
    schedule lock after marking the course deleted) withdraws what was just
    placed; if the deletion runs first, step 3 sees deleted_at and refuses.
    Either way the deleted course ends up with no unfinished tasks.

    `today` is computed by the caller when it runs (in a Celery task: at
    execution, never at enqueue time).
    """
    raise NotImplementedError


async def withdraw_course_tasks(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID
) -> None:
    """撤走任务: withdraw all of the course's unfinished tasks; finished ones and
    the plan stay. Called by services/course_deletion.py inside the deletion's
    transaction scope."""
    raise NotImplementedError
