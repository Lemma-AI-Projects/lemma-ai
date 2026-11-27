from core.errors import BusinessError

COURSE_NOT_CONFIRMED = "course_not_confirmed"
PLAN_LOCKED = "plan_locked"

_STATUS = {
    COURSE_NOT_CONFIRMED: 409,
    PLAN_LOCKED: 409,
}


class CourseSchedulingError(BusinessError):
    """A course scheduler action refused; nothing was written.

    PLAN_LOCKED: the course is already placed into the schedule, its plan can
    no longer be replaced. A missing or deleted course surfaces as the course
    library's course_not_found / course_deleted.
    """

    def __init__(self, code: str, message: str = "") -> None:
        super().__init__(code, _STATUS[code], message)
