"""What goes into and comes out of the course library.

Inputs refer to knowledge points by NAME (that is what the AI writes and what
the builder checks); the library turns names into ids when it stores them.
Outputs carry both id and name.
"""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

CourseVolume = Literal["light", "medium", "deep"]  # 轻度 / 中度 / 深度
CourseStatus = Literal["building", "confirmed"]  # 建课中 / 已确认


class QAPair(BaseModel):
    """问答对."""

    question: str
    answer: str


# ---------- inputs (points by name) ----------


class EdgeInput(BaseModel):
    """连线 by name: learning `after` requires knowing `before`."""

    before: str
    after: str


class KnowledgeMapInput(BaseModel):
    """写入知识地图 / 检查知识地图."""

    points: list[str]
    edges: list[EdgeInput]


class LessonInput(BaseModel):
    title: str
    goal: str
    points: list[str]


class UnitInput(BaseModel):
    name: str
    lessons: list[LessonInput]


class ChapterInput(BaseModel):
    name: str
    units: list[UnitInput]


class SyllabusInput(BaseModel):
    """写入课表 / 检查课表."""

    name: str
    chapters: list[ChapterInput]


# ---------- outputs (points by id and name) ----------


class CourseCounts(BaseModel):
    chapters: int
    units: int
    lessons: int
    points: int
    edges: int


class CourseInfo(BaseModel):
    """查课程 / 查用户的课程."""

    id: uuid.UUID
    user_id: uuid.UUID
    name: str | None
    volume: CourseVolume
    original_request: str
    qa_pairs: list[QAPair] | None
    status: CourseStatus
    confirmed_at: datetime | None
    deleted_at: datetime | None
    counts: CourseCounts


class KnowledgePoint(BaseModel):
    id: str
    name: str


class KnowledgeEdge(BaseModel):
    """`before` / `after` are point ids."""

    before: str
    after: str


class KnowledgeMap(BaseModel):
    """查知识地图."""

    points: list[KnowledgePoint]
    edges: list[KnowledgeEdge]


class SyllabusLesson(BaseModel):
    id: uuid.UUID
    number: int  # 第几课, counted top to bottom
    title: str
    goal: str
    weight: int  # 份量 = number of points
    points: list[KnowledgePoint]


class SyllabusUnit(BaseModel):
    id: uuid.UUID
    name: str
    lessons: list[SyllabusLesson]


class SyllabusChapter(BaseModel):
    id: uuid.UUID
    name: str
    units: list[SyllabusUnit]


class Syllabus(BaseModel):
    """查课表. Before 写入课表, `name` is None and `chapters` is empty."""

    name: str | None
    chapters: list[SyllabusChapter]


class NodeRef(BaseModel):
    id: uuid.UUID
    name: str


class LessonDetail(BaseModel):
    """查一节课. Points are in their order within the lesson."""

    id: uuid.UUID
    number: int
    title: str
    goal: str
    weight: int
    chapter: NodeRef
    unit: NodeRef
    points: list[KnowledgePoint]
    previous_lesson_id: uuid.UUID | None
    next_lesson_id: uuid.UUID | None


class PrerequisitePoint(BaseModel):
    id: str
    name: str
    lesson_id: uuid.UUID | None  # the lesson it sits in; None before a syllabus


class Prerequisites(BaseModel):
    """查前置. For a lesson, points inside that lesson are left out."""

    direct: list[PrerequisitePoint]
    all: list[PrerequisitePoint]
