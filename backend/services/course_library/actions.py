"""The six actions (六个动作) — the only way to change the course library —
plus 检查课表.

Every action:
- runs inside `transaction(db)` (core/transaction.py): standalone it commits,
  inside a larger scope it joins it; all or nothing either way;
- first locks the course row with an ownership-filtered SELECT ... FOR UPDATE
  (同一门课的写入一个一个来), except create_course;
- refuses with CourseLibraryError and writes nothing when a check fails.

Lock order across modules: the course row lock is always taken before the
schedule lock; nothing here touches the schedule.
"""

import uuid
from collections.abc import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from models.course import Course
from services.course_library.types import (
    CourseVolume,
    KnowledgeMapInput,
    QAPair,
    SyllabusInput,
)


async def _lock_owned_course(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    allow_confirmed: bool = False,
    allow_deleted: bool = False,
) -> Course:
    """SELECT ... FOR UPDATE on the course filtered by id AND user_id, read
    fresh (populate_existing). Raises course_not_found / course_deleted /
    course_confirmed as the flags require."""
    raise NotImplementedError


async def create_course(
    db: AsyncSession, *, user_id: uuid.UUID, volume: CourseVolume, original_request: str
) -> uuid.UUID:
    """新建课程: one course row with a new id; qa pairs, name, confirmed_at and
    deleted_at empty. Returns the course id."""
    raise NotImplementedError


async def write_qa_pairs(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID, qa_pairs: Sequence[QAPair]
) -> None:
    """写入问答对: replace the whole list. Refused once confirmed or deleted."""
    raise NotImplementedError


async def write_knowledge_map(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    knowledge_map: KnowledgeMapInput,
) -> None:
    """写入知识地图: refused once confirmed or deleted, or when the map does
    not make sense (knowledge_map_invalid with problems) or two names hash to
    the same id (point_id_collision).

    Clears the course's points, edges, chapters, units and lessons (positions
    first, then lessons, because the position FK has no ON DELETE action),
    then writes one row per point (id computed, no position) and per edge
    (names turned into ids).
    """
    raise NotImplementedError


async def write_syllabus(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID, syllabus: SyllabusInput
) -> None:
    """写入课表: refused once confirmed or deleted, without a map
    (knowledge_map_missing), or when the syllabus does not make sense against
    the stored map (syllabus_invalid with problems).

    Clears positions, then chapters/units/lessons; writes the course name,
    one row per chapter, unit and lesson (new ids, order as given) and every
    point's position.
    """
    raise NotImplementedError


async def confirm_course(db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID) -> None:
    """确认: confirmed_at = now. Needs a syllabus (syllabus_missing); confirming
    again changes nothing; refused once deleted."""
    raise NotImplementedError


async def delete_course(db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID) -> None:
    """删除课程: deleted_at = now, content kept. Deleting again changes nothing.

    Users delete through services/course_deletion.py, which also withdraws
    the course's schedule tasks in the same transaction.
    """
    raise NotImplementedError


async def check_syllabus(
    db: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID, syllabus: SyllabusInput
) -> list[str]:
    """检查课表: findings for a syllabus against the course's stored map,
    exactly what write_syllabus would refuse with. Writes nothing. Raises
    course_not_found / knowledge_map_missing."""
    raise NotImplementedError
