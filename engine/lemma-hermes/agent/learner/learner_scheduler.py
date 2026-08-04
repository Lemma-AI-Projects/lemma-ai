"""learner_scheduler — spaced-repetition scheduling surface (W2.2).

The due-review queue itself is served per-turn by the dynamic prefetch
channel (M1) and by the ``learner_state`` tool action ``due_reviews`` (W2.2).
This module adds the optional cron review job — OFF by default
(``learner.cron_review_enabled``), registered through the existing
``cron.jobs.create_job`` machinery (jobs.json, same store as every other job).

Note: the cron job runs a real agent turn, so it only works where the cron
agent has the learner_state tool available (learner enabled). When
``cron_review_enabled`` is off (default) nothing is registered and there is
no runtime surface at all.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

REVIEW_JOB_NAME = "learner-daily-review"

_REVIEW_PROMPT = (
    "Run the learner review: call learner_state action=due_reviews. "
    "If that tool is not available, say so and stop without guessing. "
    "Output the due concepts with their mastery as a checklist."
)


def _find_by_name(name: str) -> Optional[Dict[str, Any]]:
    from cron.jobs import list_jobs

    for job in list_jobs() or []:
        if job.get("name") == name:
            return job
    return None


def register_review_job(
    schedule: str = "daily",
    name: str = REVIEW_JOB_NAME,
) -> Optional[Dict[str, Any]]:
    """Create the daily learner-review cron job (idempotent by name)."""
    try:
        from cron.jobs import create_job
    except Exception:
        return None
    try:
        existing = _find_by_name(name)
        if existing:
            return existing
        return create_job(
            prompt=_REVIEW_PROMPT,
            schedule=schedule,
            name=name,
            repeat=None,
        )
    except Exception:
        return None


def remove_review_job(name: str = REVIEW_JOB_NAME) -> bool:
    """Delete the review cron job if present."""
    try:
        from cron.jobs import remove_job
    except Exception:
        return False
    try:
        job = _find_by_name(name)
        if job is None:
            return False
        remove_job(str(job.get("id", "")))
        return True
    except Exception:
        return False


def maybe_sync_review_job(enabled: bool, schedule: str = "daily") -> bool:
    """Idempotently register (enabled) or remove (disabled) the review job.

    Called from agent init so config changes take effect on next start.
    Returns True when the desired state is reached.
    """
    if enabled:
        return register_review_job(schedule=schedule) is not None
    return remove_review_job()