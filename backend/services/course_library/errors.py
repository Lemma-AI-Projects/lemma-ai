from collections.abc import Sequence

from core.errors import BusinessError

COURSE_NOT_FOUND = "course_not_found"
COURSE_CONFIRMED = "course_confirmed"
COURSE_DELETED = "course_deleted"
KNOWLEDGE_MAP_MISSING = "knowledge_map_missing"
SYLLABUS_MISSING = "syllabus_missing"
KNOWLEDGE_MAP_INVALID = "knowledge_map_invalid"
SYLLABUS_INVALID = "syllabus_invalid"
POINT_ID_COLLISION = "point_id_collision"

_STATUS = {
    COURSE_NOT_FOUND: 404,
    COURSE_CONFIRMED: 409,
    COURSE_DELETED: 409,
    KNOWLEDGE_MAP_MISSING: 409,
    SYLLABUS_MISSING: 409,
    KNOWLEDGE_MAP_INVALID: 422,
    SYLLABUS_INVALID: 422,
    POINT_ID_COLLISION: 409,
}


class CourseLibraryError(BusinessError):
    """A course library action refused. Nothing was written.

    "Not yours" and "not there" are both COURSE_NOT_FOUND. The two *_INVALID
    codes carry `problems`: the check's findings verbatim, one sentence each,
    so the builder can hand them back to the AI.
    """

    def __init__(self, code: str, *, problems: Sequence[str] = (), message: str = "") -> None:
        super().__init__(code, _STATUS[code], message)
        self.problems = list(problems)
