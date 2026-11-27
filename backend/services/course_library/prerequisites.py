"""Prerequisites (前置). Pure; works on point ids or names alike."""

from collections.abc import Sequence

Edge = tuple[str, str]  # (before, after)


def direct_prerequisites(point: str, edges: Sequence[Edge]) -> list[str]:
    """直接前置: points with an edge straight into `point`."""
    raise NotImplementedError


def all_prerequisites(point: str, edges: Sequence[Edge]) -> list[str]:
    """全部前置: every point reachable by walking edges backwards."""
    raise NotImplementedError


def lesson_prerequisites(
    lesson_points: Sequence[str], edges: Sequence[Edge], *, map_order: Sequence[str]
) -> tuple[list[str], list[str]]:
    """一节课的前置: (direct, all) of the lesson's points combined, minus the
    points already in the lesson, each list in `map_order`."""
    raise NotImplementedError
