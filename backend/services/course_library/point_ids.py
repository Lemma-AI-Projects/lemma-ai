"""Knowledge point ids. Pure: no database, no clock."""

import uuid


def canonical_point_name(name: str) -> str:
    """The form a point name is stored and compared in: leading and trailing
    whitespace removed, otherwise unchanged. Ids, uniqueness and every check
    use this form."""
    raise NotImplementedError


def point_id(course_id: uuid.UUID, name: str, *, length: int) -> str:
    """编号 = 哈希(课程编号 + 名称) 的前 `length` 位.

    Lowercase hex prefix of sha256(f"{course_id}|{canonical name}"). Same
    course and name always give the same id, so rewriting the map keeps the
    ids of points whose names did not change. Collisions within one course are
    detected by the write action (point_id_collision), not here.
    """
    raise NotImplementedError
