"""What goes into and comes out of the course scheduler."""

import uuid
from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, Field, model_validator

# Tasks this scheduler places carry SourceRef(kind=COURSE_SOURCE_KIND,
# id=str(course_id)) and item_ref=str(lesson_id).
COURSE_SOURCE_KIND = "course"

Weekday = Annotated[int, Field(ge=0, le=6)]  # 0 = Monday ... 6 = Sunday
SchedulePeriod = Literal["unlimited", "two_weeks", "one_month", "until_date"]  # 不限 / 2 周 / 1 个月 / 到某天


class PlanInput(BaseModel):
    """存排期计划. The shape is guarded here and refused, never repaired:
    turning "until_date without a deadline" into "unlimited" is the course
    builder's job before it calls save_plan, and so is "deadline later than
    today"."""

    study_weekdays: list[Weekday] = Field(min_length=1, max_length=7)
    period: SchedulePeriod
    deadline: date | None = None

    @model_validator(mode="after")
    def _shape(self) -> "PlanInput":
        if len(set(self.study_weekdays)) != len(self.study_weekdays):
            raise ValueError("study_weekdays must not repeat a day")
        if (self.period == "until_date") != (self.deadline is not None):
            raise ValueError("deadline is required for until_date and only for it")
        return self


class SchedulePlan(BaseModel):
    """排期计划 as stored. start_date / end_date are set when the course is
    placed into the schedule; end_date stays None for an unlimited period."""

    course_id: uuid.UUID
    user_id: uuid.UUID
    study_weekdays: list[Weekday]
    period: SchedulePeriod
    deadline: date | None
    start_date: date | None
    end_date: date | None


class LessonDate(BaseModel):
    """One lesson of a 试排 (preview) result."""

    lesson_id: uuid.UUID
    number: int  # 第几课
    planned_date: date
