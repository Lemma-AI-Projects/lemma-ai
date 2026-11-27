"""Course library (课程库): stores a course's content — requirements, knowledge
map, syllabus — gives every piece a stable id and keeps the content
consistent. It never calls AI, the schedule, or any other system.

This module is the only public entry. Code outside the package imports from
here, never from the inner modules, and never touches the course tables
(models/course*.py) directly. Writes go through the six actions, reads
through the five queries.

Callers state who is asking (user_id); the library filters by it, so "not
yours" and "not there" look the same.
"""

from services.course_library.actions import (
    check_syllabus,
    confirm_course,
    create_course,
    delete_course,
    write_knowledge_map,
    write_qa_pairs,
    write_syllabus,
)
from services.course_library.checks import check_knowledge_map
from services.course_library.errors import (
    COURSE_CONFIRMED,
    COURSE_DELETED,
    COURSE_NOT_FOUND,
    KNOWLEDGE_MAP_INVALID,
    KNOWLEDGE_MAP_MISSING,
    POINT_ID_COLLISION,
    SYLLABUS_INVALID,
    SYLLABUS_MISSING,
    CourseLibraryError,
)
from services.course_library.queries import (
    get_course,
    get_knowledge_map,
    get_lesson,
    get_prerequisites,
    get_syllabus,
    list_courses,
)
from services.course_library.types import (
    ChapterInput,
    CourseCounts,
    CourseInfo,
    CourseStatus,
    CourseVolume,
    EdgeInput,
    KnowledgeEdge,
    KnowledgeMap,
    KnowledgeMapInput,
    KnowledgePoint,
    LessonDetail,
    LessonInput,
    NodeRef,
    PrerequisitePoint,
    Prerequisites,
    QAPair,
    Syllabus,
    SyllabusChapter,
    SyllabusInput,
    SyllabusLesson,
    SyllabusUnit,
    UnitInput,
)

__all__ = [
    "COURSE_CONFIRMED",
    "COURSE_DELETED",
    "COURSE_NOT_FOUND",
    "KNOWLEDGE_MAP_INVALID",
    "KNOWLEDGE_MAP_MISSING",
    "POINT_ID_COLLISION",
    "SYLLABUS_INVALID",
    "SYLLABUS_MISSING",
    "ChapterInput",
    "CourseCounts",
    "CourseInfo",
    "CourseLibraryError",
    "CourseStatus",
    "CourseVolume",
    "EdgeInput",
    "KnowledgeEdge",
    "KnowledgeMap",
    "KnowledgeMapInput",
    "KnowledgePoint",
    "LessonDetail",
    "LessonInput",
    "NodeRef",
    "PrerequisitePoint",
    "Prerequisites",
    "QAPair",
    "Syllabus",
    "SyllabusChapter",
    "SyllabusInput",
    "SyllabusLesson",
    "SyllabusUnit",
    "UnitInput",
    "check_knowledge_map",
    "check_syllabus",
    "confirm_course",
    "create_course",
    "delete_course",
    "get_course",
    "get_knowledge_map",
    "get_lesson",
    "get_prerequisites",
    "get_syllabus",
    "list_courses",
    "write_knowledge_map",
    "write_qa_pairs",
    "write_syllabus",
]
