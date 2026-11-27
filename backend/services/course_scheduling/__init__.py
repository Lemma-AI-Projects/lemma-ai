"""Course scheduler (课程排期器): puts a course's lessons on concrete days and
replans them from today on when one wasn't finished on its day. A source of
the schedule system, built on the course library and the schedule.

It stores only the schedule plan; tasks live in the schedule book and the
syllabus in the course library. No AI: the same input always gives the same
dates.

This module is the only public entry. Replanning and progress reconciling
are not called directly: they are the two entries registered with the
schedule rules layer (register_as_schedule_source).
"""

from services.course_scheduling.errors import (
    COURSE_NOT_CONFIRMED,
    PLAN_LOCKED,
    CourseSchedulingError,
)
from services.course_scheduling.plans import get_plan, save_plan
from services.course_scheduling.scheduler import (
    place_into_schedule,
    preview,
    withdraw_course_tasks,
)
from services.course_scheduling.source import register_as_schedule_source
from services.course_scheduling.types import (
    COURSE_SOURCE_KIND,
    LessonDate,
    PlanInput,
    SchedulePeriod,
    SchedulePlan,
    Weekday,
)

__all__ = [
    "COURSE_NOT_CONFIRMED",
    "COURSE_SOURCE_KIND",
    "PLAN_LOCKED",
    "CourseSchedulingError",
    "LessonDate",
    "PlanInput",
    "SchedulePeriod",
    "SchedulePlan",
    "Weekday",
    "get_plan",
    "place_into_schedule",
    "preview",
    "register_as_schedule_source",
    "save_plan",
    "withdraw_course_tasks",
]
