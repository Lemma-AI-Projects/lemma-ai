"""Values the library derives on read and never stores. Pure."""

import uuid
from collections.abc import Sequence
from datetime import datetime

from services.course_library.types import CourseStatus


def course_status(confirmed_at: datetime | None) -> CourseStatus:
    """状态: building until confirmed_at is set, then confirmed."""
    raise NotImplementedError


def number_lessons(tree: Sequence[Sequence[Sequence[uuid.UUID]]]) -> dict[uuid.UUID, int]:
    """第几课: chapters -> units -> lesson ids, each level already in order;
    lessons are numbered 1.. counting top to bottom."""
    raise NotImplementedError


def lesson_weight(points: Sequence[object]) -> int:
    """份量: the number of points in the lesson."""
    raise NotImplementedError
