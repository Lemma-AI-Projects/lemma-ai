"""The five queries (五个查询). Read only.

Every query filters by course id AND user_id: "not yours" and "not there"
both return None. Status, lesson numbers, weights and prerequisites are
computed here from the stored rows.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from services.course_library.types import (
    CourseInfo,
    KnowledgeMap,
    LessonDetail,
    Prerequisites,
    Syllabus,
)


async def get_course(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID
) -> CourseInfo | None:
    """查课程(课程编号). Deleted courses are still returned (deleted_at set)."""
    raise NotImplementedError


async def list_courses(
    db: AsyncSession, *, user_id: uuid.UUID, limit: int = 50, offset: int = 0
) -> list[CourseInfo]:
    """查用户的课程: newest first, without deleted courses."""
    raise NotImplementedError


async def get_syllabus(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID
) -> Syllabus | None:
    """查课表: the whole tree, each lesson with its number, weight and points."""
    raise NotImplementedError


async def get_knowledge_map(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID
) -> KnowledgeMap | None:
    """查知识地图: points (id, name) and edges (ids)."""
    raise NotImplementedError


async def get_lesson(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID, lesson_id: uuid.UUID
) -> LessonDetail | None:
    """查一节课: also None when the lesson is not in this course."""
    raise NotImplementedError


async def get_prerequisites(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    point_id: str | None = None,
    lesson_id: uuid.UUID | None = None,
) -> Prerequisites | None:
    """查前置 of one point or one lesson (exactly one of the two must be given;
    ValueError otherwise). None when the course, point or lesson is not found."""
    raise NotImplementedError
