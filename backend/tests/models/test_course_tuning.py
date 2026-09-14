"""Unit tests for the Course.tuning_json column (Free-Course persona).

Pure unit tests: construct the mapped Course object in memory and assert the
tuning_json attribute round-trips. No DB / no network required (Alembic
migration for this column is committed but intentionally NOT applied; see
f7a8b9c0d1e2 precedent).
"""

from models.course import Course


class TestCourseTuningJson:
    def test_accepts_tuning_json(self) -> None:
        course = Course(tuning_json={"course_volume": "systematic"})
        assert course.tuning_json == {"course_volume": "systematic"}

    def test_defaults_to_none(self) -> None:
        course = Course()
        assert course.tuning_json is None