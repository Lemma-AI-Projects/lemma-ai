"""Dates from a schedule plan. Pure."""

from collections.abc import Sequence
from datetime import date

from services.course_scheduling.types import SchedulePeriod


def end_date_for(
    period: SchedulePeriod,
    *,
    start: date,
    deadline: date | None,
    two_weeks_days: int,
    one_month_days: int,
) -> date | None:
    """结束日: two_weeks -> start + (two_weeks_days − 1); one_month -> start +
    (one_month_days − 1); until_date -> deadline; unlimited -> None."""
    raise NotImplementedError


def study_days(start: date, end: date, study_weekdays: Sequence[int]) -> list[date]:
    """Every date from start to end inclusive whose weekday (Monday = 0) is a
    study weekday, in order."""
    raise NotImplementedError
