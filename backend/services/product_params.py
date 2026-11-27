"""Provisional product parameters (暂定的数), one section per module.

These are product decisions, not deployment configuration: they live in code,
not in .env, and changing one never needs a code search — edit it here.

Each section may only be imported by the module named in its comment
(tests/test_architecture.py enforces this). Pure functions never read this
file; the owning module passes the numbers in, so tests can use others.
"""

from collections.abc import Mapping
from dataclasses import dataclass, field
from types import MappingProxyType


@dataclass(frozen=True)
class CourseLibraryParams:
    # 知识点编号的位数: hex digits kept from the hash of (course id + name).
    point_id_length: int = 8


@dataclass(frozen=True)
class ScheduleParams:
    # 舒适量: knowledge points per day that count as a comfortable load.
    comfort_load: float = 6


@dataclass(frozen=True)
class CourseSchedulingParams:
    # 周期折算的天数, counting the start day.
    two_weeks_days: int = 14
    one_month_days: int = 30


@dataclass(frozen=True)
class CourseBuilderParams:
    # 三档课程体量的知识点总数, inclusive ranges keyed by course volume.
    volume_point_ranges: Mapping[str, tuple[int, int]] = field(
        default_factory=lambda: MappingProxyType(
            {"light": (5, 10), "medium": (11, 20), "deep": (21, 40)}
        )
    )
    # 每个单元最多几节课.
    max_lessons_per_unit: int = 5


@dataclass(frozen=True)
class UserParams:
    # Used when a profile has no (valid) IANA timezone.
    default_timezone: str = "Asia/Shanghai"


COURSE_LIBRARY = CourseLibraryParams()  # services.course_library
SCHEDULE = ScheduleParams()  # services.schedule
COURSE_SCHEDULING = CourseSchedulingParams()  # services.course_scheduling
COURSE_BUILDER = CourseBuilderParams()  # services.course_builder
USER = UserParams()  # services.user_service
