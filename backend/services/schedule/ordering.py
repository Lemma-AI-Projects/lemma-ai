"""Invariant 4 of the schedule book (先后不倒). Pure; schedule-book layer."""

from collections.abc import Sequence

from services.schedule.types import OrderKey


def order_violations(unfinished: Sequence[OrderKey]) -> list[tuple[str, str]]:
    """Pairs (earlier item_ref, later item_ref) where a task with a smaller
    sequence is planned after one with a larger sequence.

    Pass one source's UNFINISHED tasks only, as they would be after the
    placement or move: a lesson finished early stays on its old day and takes
    no part in the comparison. Tasks without a sequence are ignored.
    """
    raise NotImplementedError
