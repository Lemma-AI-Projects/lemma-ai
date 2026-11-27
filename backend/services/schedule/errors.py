from core.errors import BusinessError

TASK_NOT_FOUND = "task_not_found"
TASK_COMPLETED = "task_completed"
TASK_ORDER_VIOLATION = "task_order_violation"
INVALID_PROGRESS = "invalid_progress"
SCHEDULE_BUSY = "schedule_busy"
SOURCE_NOT_REGISTERED = "source_not_registered"

_STATUS = {
    TASK_NOT_FOUND: 404,
    TASK_COMPLETED: 409,
    TASK_ORDER_VIOLATION: 409,
    INVALID_PROGRESS: 422,
    SCHEDULE_BUSY: 409,
    SOURCE_NOT_REGISTERED: 500,
}


class ScheduleError(BusinessError):
    """A schedule action refused; the whole batch is left unchanged.

    SCHEDULE_BUSY: waiting for the user's schedule lock timed out.
    SOURCE_NOT_REGISTERED: a task's source kind has no registered handler —
    a wiring bug, never the user's fault.
    """

    def __init__(self, code: str, message: str = "") -> None:
        super().__init__(code, _STATUS[code], message)
