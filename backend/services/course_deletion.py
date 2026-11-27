"""Deleting a course: a use case above both foundations, so the course
library never has to know the scheduler exists."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession


async def delete_course(db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID) -> None:
    """One transaction scope: course_library.delete_course (locks the course
    row, sets deleted_at), then course_scheduling.withdraw_course_tasks (takes
    the schedule lock, withdraws the unfinished tasks). Either both happen or
    neither, so no task of a deleted course is left behind.

    Lock order matches the global rule: course row first, schedule second.
    """
    raise NotImplementedError
