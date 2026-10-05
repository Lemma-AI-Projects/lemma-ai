"""Where a space's episodes are written and read — the one door.

Same discipline as `services/evidence_entry.py` and
`services/space_goal_service.py`, for the same reason: an episode decides what
the learner is pushed to do next, so an episode that got in through a second
path is a decision nobody can explain later. Everything that opens, closes or
reads an episode goes through this module.

What it owns, and nothing else:

  * **The five exits and their vocabulary.** `status` is a closed set of six, and
    two of them (`switched` / `rediagnosed`) cannot happen without a reason —
    a silent change and a random change are indistinguishable afterwards, and
    "why am I being taught this differently now" is a question the learner is
    entitled to ask.
  * **At most one live episode per space.** The database enforces it (the
    partial unique index on `status = 'active'`), and this module checks first
    so the caller gets a refusal it can explain rather than an IntegrityError.
    The order matters: check-then-insert serves the caller, the index serves
    correctness.
  * **Not closing something twice.** Closing a closed episode raises rather than
    overwriting, because a second close usually means two code paths both think
    they ended the same promise — and the second one would erase the first's
    reason.
  * **Not a decision.** This module never chooses a method, never asks whether
    an episode is finished, and never touches Learner State. Completion is
    judged elsewhere (`ai/methods/completion.py`), from evidence alone, so that
    the check can be recomputed from the table at any time.

Deliberately absent: history, `superseded_by`, and any way to reopen a closed
episode. Restoring one is V1's business and would need a lifecycle to be honest
about; until then "it is closed" is the truth.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.method_episode import (
    EXITS_THAT_MUST_EXPLAIN,
    EPISODE_STATUSES,
    MethodEpisode,
)
from models.project import Project

#: The status a live episode has. Named once so the service and any future
#: caller cannot drift on a literal.
ACTIVE = "active"


class EpisodeRefused(Exception):
    """A refusal the caller can act on, in the caller's own vocabulary.

    Carries the HTTP status so the API does not have to guess it from a message
    string — the same shape as `space_goal_service.GoalRefused`.
    """

    def __init__(self, reason: str, *, status: int = 422) -> None:
        super().__init__(reason)
        self.reason = reason
        self.status = status


async def _owned_space(
    db: AsyncSession, *, user_id: uuid.UUID, project_id: uuid.UUID
) -> uuid.UUID:
    """The space's id, or a 404. Never a guess at someone else's data."""
    owned = (
        await db.execute(
            select(Project.id).where(
                Project.id == project_id, Project.user_id == user_id
            )
        )
    ).scalar_one_or_none()
    if owned is None:
        raise EpisodeRefused("space_not_found", status=404)
    return owned


async def get_active(
    db: AsyncSession, *, project_id: uuid.UUID
) -> MethodEpisode | None:
    """The space's live episode, or None. The read every decision makes.

    `None` is a legitimate and common answer: a space where nothing has been
    started has no episode, and that is not a gap to be filled by inventing one.
    """
    return (
        await db.execute(
            select(MethodEpisode).where(
                MethodEpisode.project_id == project_id,
                MethodEpisode.status == ACTIVE,
            )
        )
    ).scalar_one_or_none()


async def list_for_space(
    db: AsyncSession, *, project_id: uuid.UUID, limit: int = 20
) -> list[MethodEpisode]:
    """A space's episodes, newest first. The "continue last time" read."""
    rows = (
        await db.execute(
            select(MethodEpisode)
            .where(MethodEpisode.project_id == project_id)
            .order_by(MethodEpisode.opened_at.desc())
            .limit(limit)
        )
    ).scalars()
    return list(rows)


async def open_episode(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    method: str,
    commitment: str,
    completion_rule: dict[str, Any],
    evidence_target: dict[str, Any],
    goal_purpose: str | None = None,
    focus_label: str | None = None,
    conversation_id: uuid.UUID | None = None,
) -> MethodEpisode:
    """Start one stretch of work under one method.

    Refuses when the space already has a live episode, rather than closing the
    old one first: which exit it deserves is a decision, and making it here
    would mean the caller never learns it happened.

    The declared `completion_rule` and `evidence_target` are **snapshotted**.
    They are what this episode promised, and a purpose edited tomorrow must not
    retroactively change what was promised today.
    """
    await _owned_space(db, user_id=user_id, project_id=project_id)
    if not method.strip():
        raise EpisodeRefused("method_is_required")
    if not commitment.strip():
        raise EpisodeRefused("commitment_is_required")
    if await get_active(db, project_id=project_id) is not None:
        raise EpisodeRefused("space_already_has_active_episode")
    episode = MethodEpisode(
        project_id=project_id,
        user_id=user_id,
        conversation_id=conversation_id,
        method=method,
        goal_purpose=goal_purpose,
        focus_label=focus_label,
        commitment=commitment,
        evidence_target=dict(evidence_target),
        completion_rule=dict(completion_rule),
        status=ACTIVE,
    )
    db.add(episode)
    await db.commit()
    await db.refresh(episode)
    return episode


async def close_episode(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    episode_id: uuid.UUID,
    status: str,
    reason: str | None = None,
) -> MethodEpisode:
    """End it, through one of the five exits.

    Three refusals, each catching a different way this goes wrong in production:

    * a `status` outside the closed set — there are six, and inventing a seventh
      is how a lifecycle appears without anyone designing one;
    * `switched` / `rediagnosed` with no reason — the silent-change problem;
    * closing something already closed — which usually means two code paths
      both think they ended the same promise, and the second would erase the
      first one's reason.
    """
    if status not in EPISODE_STATUSES or status == ACTIVE:
        raise EpisodeRefused("episode_status_invalid")
    if status in EXITS_THAT_MUST_EXPLAIN and not (reason or "").strip():
        raise EpisodeRefused("episode_exit_reason_required")

    episode = (
        await db.execute(
            select(MethodEpisode).where(
                MethodEpisode.id == episode_id, MethodEpisode.user_id == user_id
            )
        )
    ).scalar_one_or_none()
    if episode is None:
        raise EpisodeRefused("episode_not_found", status=404)
    if episode.status != ACTIVE:
        raise EpisodeRefused("episode_already_closed")
    episode.status = status
    episode.exit_reason = (reason or "").strip() or None
    episode.closed_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(episode)
    return episode


async def get_owned(
    db: AsyncSession, *, user_id: uuid.UUID, episode_id: uuid.UUID
) -> MethodEpisode:
    """One episode, or a 404. The IDOR rule, in one place."""
    episode = (
        await db.execute(
            select(MethodEpisode).where(
                MethodEpisode.id == episode_id, MethodEpisode.user_id == user_id
            )
        )
    ).scalar_one_or_none()
    if episode is None:
        raise EpisodeRefused("episode_not_found", status=404)
    return episode


__all__ = [
    "ACTIVE",
    "EpisodeRefused",
    "close_episode",
    "get_active",
    "get_owned",
    "list_for_space",
    "open_episode",
]
