"""Composition root for schedule sources: registers every source with the
schedule rules layer. Call once per process — in the API lifespan and when a
Celery worker loads — before anything queries the schedule.

Adding a source = one more line here; the rules layer and the schedule book
stay untouched.
"""

from services import course_scheduling


def register_schedule_sources() -> None:
    course_scheduling.register_as_schedule_source()
