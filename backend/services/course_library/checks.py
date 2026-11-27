"""Whether a knowledge map / syllabus makes sense (说得通). Pure.

These are the library's own checks (invariants 2-6), run on every write and
offered read-only through check_knowledge_map / check_syllabus. Product rules
(point count per volume, "every point has an edge", lessons per unit) belong
to the course builder, not here.

Points are identified by canonical name. Each finding is one sentence in the
wording of the course library handoff doc; an empty list means it passes.
"""

from collections.abc import Sequence

from services.course_library.types import KnowledgeMapInput, SyllabusInput

Edge = tuple[str, str]  # (before, after)


def find_cycle(points: Sequence[str], edges: Sequence[Edge]) -> list[str] | None:
    """One cycle as [a, b, ..., a], or None.

    Repeatedly remove a point no edge points to (with its outgoing edges);
    if points remain, walk backwards along edges from one of them until a
    point repeats — that stretch is the cycle.
    """
    raise NotImplementedError


def knowledge_map_problems(points: Sequence[str], edges: Sequence[Edge]) -> list[str]:
    """Names non-empty and unique; both ends of every edge are listed points,
    not the same point, edge not repeated; no cycle (only looked for when no
    edge has a dangling end)."""
    raise NotImplementedError


def syllabus_problems(
    syllabus: SyllabusInput, points: Sequence[str], edges: Sequence[Edge]
) -> list[str]:
    """Checked against the course's stored map.

    Course name present and at least one chapter; every chapter / unit has a
    name and at least one child; every lesson has title, goal and at least one
    point; reading the tree top to bottom, every point in it belongs to the
    map and every map point appears exactly once; for every edge, `before`
    comes earlier than `after` in that reading order.
    """
    raise NotImplementedError


def check_knowledge_map(knowledge_map: KnowledgeMapInput) -> list[str]:
    """检查知识地图: findings for a map as it would be passed to
    write_knowledge_map. Writes nothing."""
    raise NotImplementedError
