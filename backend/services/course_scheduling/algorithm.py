"""The scheduling algorithm (排期算法), exactly as in the course scheduling
handoff doc: pour the lessons' weight like water into the emptiest days to
get each lesson's ideal day, then place whole lessons by dynamic programming,
comparing (flatness, nearness) lexicographically. Pure and deterministic: no
database, no clock, no AI.

Used by preview, placement and replanning alike. Replacing the algorithm
means replacing plan_dates.

Weights may be fractional (a half-finished lesson counts only what is left).
"""

from collections.abc import Mapping, Sequence
from datetime import date
from typing import NamedTuple

# Two numbers closer than this are equal (part of the algorithm's definition).
EPS = 1e-9


class Slot(NamedTuple):
    """One available study day and the load already on it."""

    day: date
    existing: float


def water_level(existing: Sequence[float], total: float) -> float:
    """水位: the height at which pouring `total` into the emptiest days levels
    them exactly."""
    raise NotImplementedError


def ideal_days(weights: Sequence[float], slots: Sequence[Slot]) -> list[int]:
    """理想日: for each lesson in order, the index of the first slot whose
    cumulative ideal amount exceeds the weight of the lessons before it
    (the last slot when none does)."""
    raise NotImplementedError


def place(weights: Sequence[float], slots: Sequence[Slot]) -> list[int]:
    """落课: the slot index of each lesson, order kept, minimising first the
    sum of squared day totals, then the sum of squared distances to the ideal
    day. Ties keep the arrangement tried first (k from i downwards)."""
    raise NotImplementedError


def peak_of(weights: Sequence[float], slots: Sequence[Slot], placement: Sequence[int]) -> float:
    """最忙的一天: the largest day total among the slots that got lessons."""
    raise NotImplementedError


def plan_dates(
    weights: Sequence[float],
    *,
    start: date,
    end: date | None,
    study_weekdays: Sequence[int],
    load: Mapping[date, float],
    comfort: float,
) -> list[date]:
    """排期: one planned date per lesson, in lesson order.

    With an end date and at least one study day between start and end: place
    into those days. Otherwise (no end date, or the end date already passed):
    find the smallest m whose first m study days have room for the total
    weight below `comfort`, then try m .. m + number of lessons days, keep
    the arrangement with the lowest peak, and stop as soon as the peak is at
    most `comfort`. Study days are looked up at most 400 days ahead.

    The result always satisfies: one date per lesson; earlier lessons never
    later than later ones; every date a study day not before start; with an
    end date in use, none after it.
    """
    raise NotImplementedError
