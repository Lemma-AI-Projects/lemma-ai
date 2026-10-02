"""Where a space's goal is written and read — the one door.

Same discipline as `services/evidence_entry.py`, for the same reason: a goal
drives ranking and termination, so a goal that got in through a second path is
a decision nobody can explain later. Everything that changes a goal goes through
this module, and every change leaves a trace in Space Memory (which already
exists) rather than in a history table (which does not).

Three things this module owns:

  * **`outcome_kind`** — whether the goal's result is something the system can
    ever observe. It is a *function of* `purpose`, so it is derived here and not
    stored: "an exam score" and "can explain why" are judged by different
    parties, and the whole point of the distinction is that the system must not
    claim the first one.
  * **Who closed it** — `system_*` reasons are the system's own judgement and may
    be overturned by new evidence; `user_*` reasons are the learner's decision
    and may not.
  * **The confirm step.** A goal is created `draft` and does nothing until the
    learner confirms it. This is not bureaucracy: an unconfirmed goal is a
    *guess* about what somebody wants, and a guess that silently steers every
    later decision is the most expensive kind of wrong.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.project import Project
from models.space_goal import SpaceGoal
from schemas.space_goal import SpaceGoalCreateIn, SpaceGoalOut, SpaceGoalUpdateIn
from services import space_memory_service

#: Reasons whose prefix is a person, not the system.
_USER_PREFIX = "user_"


class GoalRefused(Exception):
    """A refusal the caller can act on, in the caller's own vocabulary.

    Carries the HTTP status so the API does not have to guess it from a message
    string — the same shape as `board_context_service.ContextRefused`.
    """

    def __init__(self, reason: str, *, status: int = 422) -> None:
        super().__init__(reason)
        self.reason = reason
        self.status = status


def outcome_kind(purpose: str) -> str:
    """Whether the system may ever judge this goal's result.

    Only `understanding` is observable *by the system*: "can explain it" and
    "can produce a counterexample" leave evidence behind. An exam score and a
    shipped project do not — they are reported by the learner, and `other` is
    treated the same way because an unknown purpose is exactly the case where
    the system has no business claiming it can tell.
    """
    return "system_observable" if purpose == "understanding" else "externally_reported"


def is_user_close(reason: str) -> bool:
    """True when the learner closed it, so the decision may not be revisited."""
    return reason.startswith(_USER_PREFIX)


def to_out(goal: SpaceGoal) -> SpaceGoalOut:
    """Row -> wire. `outcomeKind` is computed here rather than read off the row.

    The row has no such column (see `models/space_goal.py`), so this is the only
    place the two facts are joined — which is the point: one source, one join.
    """
    return SpaceGoalOut(
        id=goal.id,
        project_id=goal.project_id,
        target_text=goal.target_text,
        deadline_at=goal.deadline_at,
        context=goal.context,
        purpose=goal.purpose,
        origin=goal.origin,
        status=goal.status,
        confirmed_at=goal.confirmed_at,
        closed_reason=goal.closed_reason,
        outcome_kind=outcome_kind(goal.purpose),
        created_at=goal.created_at,
        updated_at=goal.updated_at,
    )


async def _owned_project_id(
    db: AsyncSession, *, user_id: uuid.UUID, project_id: uuid.UUID | None
) -> uuid.UUID | None:
    """The same IDOR rule as every other space-scoped service: prove ownership
    first, and let "not yours" collapse with "no such space"."""
    if project_id is None:
        return None
    result = await db.execute(
        select(Project.id).where(Project.id == project_id, Project.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def get_active(
    db: AsyncSession, *, project_id: uuid.UUID
) -> SpaceGoal | None:
    """The space's active goal — the only one any decision may read.

    Scoped by project alone (not user) because it is called from the decision
    path, where the space has already been resolved from the caller's own event.
    `draft` is excluded here, not at the call site: "a goal that was never
    confirmed must not steer anything" is this module's rule to keep.
    """
    result = await db.execute(
        select(SpaceGoal).where(
            SpaceGoal.project_id == project_id,
            SpaceGoal.status == "active",
        )
    )
    return result.scalar_one_or_none()


async def list_for_space(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    limit: int = 20,
) -> list[SpaceGoal] | None:
    """The space's goals, newest first. None means the space is not the caller's."""
    if await _owned_project_id(db, user_id=user_id, project_id=project_id) is None:
        return None
    rows = (
        (
            await db.execute(
                select(SpaceGoal)
                .where(SpaceGoal.project_id == project_id)
                .order_by(SpaceGoal.created_at.desc())
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )
    return list(rows)


async def _load_owned(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    goal_id: uuid.UUID,
) -> SpaceGoal:
    """One goal, proven to be the caller's and to live in this space."""
    if await _owned_project_id(db, user_id=user_id, project_id=project_id) is None:
        raise GoalRefused("space_not_found", status=404)
    goal = (
        await db.execute(
            select(SpaceGoal).where(
                SpaceGoal.id == goal_id, SpaceGoal.project_id == project_id
            )
        )
    ).scalar_one_or_none()
    if goal is None:
        raise GoalRefused("goal_not_found", status=404)
    return goal


async def create_draft(
    db: AsyncSession, *, user_id: uuid.UUID, project_id: uuid.UUID, payload: SpaceGoalCreateIn
) -> SpaceGoal:
    """Record a proposed goal. **Always `draft`** — confirming is a separate act.

    A draft may coexist with an active goal (it is not the space's direction
    yet), which is why this never has to check the partial unique index.
    """
    if await _owned_project_id(db, user_id=user_id, project_id=project_id) is None:
        raise GoalRefused("space_not_found", status=404)
    goal = SpaceGoal(
        project_id=project_id,
        user_id=user_id,
        target_text=payload.target_text.strip(),
        deadline_at=payload.deadline_at,
        context=(payload.context or "").strip() or None,
        purpose=payload.purpose,
        origin=payload.origin,
        status="draft",
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


async def confirm(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    goal_id: uuid.UUID,
) -> SpaceGoal:
    """The learner agreed this is the direction. Only now does it become readable.

    Refuses if the space already has an active goal rather than silently
    replacing it: two live directions would make every later decision
    unexplainable, and quietly dropping one is worse than asking.
    """
    goal = await _load_owned(
        db, user_id=user_id, project_id=project_id, goal_id=goal_id
    )
    if goal.status != "draft":
        raise GoalRefused("goal_not_draft")
    if await get_active(db, project_id=project_id) is not None:
        raise GoalRefused("space_already_has_active_goal")
    goal.status = "active"
    goal.confirmed_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(goal)
    return goal


async def update(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    goal_id: uuid.UUID,
    payload: SpaceGoalUpdateIn,
) -> SpaceGoal:
    """Change what the goal says. Leaves a memory behind — see the module docstring.

    Only the fields actually sent are written (`model_fields_set`), so clearing
    the deadline is expressible. A closed goal is refused: closing is not a
    pause, and "change it back" is a new goal, not an edit of an old one.
    """
    goal = await _load_owned(
        db, user_id=user_id, project_id=project_id, goal_id=goal_id
    )
    if goal.status == "closed":
        raise GoalRefused("goal_closed")

    sent = payload.model_fields_set
    before = goal.target_text
    if "target_text" in sent and payload.target_text is not None:
        goal.target_text = payload.target_text.strip()
    if "deadline_at" in sent:
        goal.deadline_at = payload.deadline_at
    if "context" in sent:
        goal.context = (payload.context or "").strip() or None
    if "purpose" in sent and payload.purpose is not None:
        goal.purpose = payload.purpose
    await db.commit()
    await db.refresh(goal)

    if goal.target_text != before:
        await space_memory_service.record(
            db,
            user_id=user_id,
            project_id=project_id,
            text=f"这个空间的目标改了：从「{before}」改为「{goal.target_text}」。",
        )
    return goal


async def _set_status(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    goal_id: uuid.UUID,
    expected: str,
    new: str,
) -> SpaceGoal:
    goal = await _load_owned(
        db, user_id=user_id, project_id=project_id, goal_id=goal_id
    )
    if goal.status != expected:
        raise GoalRefused(f"goal_not_{expected}")
    goal.status = new
    await db.commit()
    await db.refresh(goal)
    return goal


async def pause(
    db: AsyncSession, *, user_id: uuid.UUID, project_id: uuid.UUID, goal_id: uuid.UUID
) -> SpaceGoal:
    """Stop pushing, without deciding anything. Resumable, and it leaves no trace
    on purpose: pausing is not a change of direction, so it is not a memory."""
    return await _set_status(
        db,
        user_id=user_id,
        project_id=project_id,
        goal_id=goal_id,
        expected="active",
        new="paused",
    )


async def resume(
    db: AsyncSession, *, user_id: uuid.UUID, project_id: uuid.UUID, goal_id: uuid.UUID
) -> SpaceGoal:
    goal = await _load_owned(
        db, user_id=user_id, project_id=project_id, goal_id=goal_id
    )
    if goal.status != "paused":
        raise GoalRefused("goal_not_paused")
    if await get_active(db, project_id=project_id) is not None:
        raise GoalRefused("space_already_has_active_goal")
    goal.status = "active"
    await db.commit()
    await db.refresh(goal)
    return goal


async def close(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    goal_id: uuid.UUID,
    reason: str,
) -> SpaceGoal:
    """Stop pushing this direction, and say who decided that.

    Any non-closed state may be closed, `draft` included ("never mind" is a real
    ending). The reason's prefix is preserved verbatim because it decides
    something later: a `system_*` close is a judgement new evidence may overturn,
    a `user_*` close is a decision it may not.

    The API reaches this from the learner's own session; the system-side close
    (no further reason to act) will arrive from the decision path with the same
    reason vocabulary, which is why the two share one column.
    """
    goal = await _load_owned(
        db, user_id=user_id, project_id=project_id, goal_id=goal_id
    )
    if goal.status == "closed":
        raise GoalRefused("goal_already_closed")
    goal.status = "closed"
    goal.closed_reason = reason
    await db.commit()
    await db.refresh(goal)

    who = "你决定" if is_user_close(reason) else "系统判断"
    await space_memory_service.record(
        db,
        user_id=user_id,
        project_id=project_id,
        text=f"这个空间的目标关闭了（{who}）：「{goal.target_text}」。",
    )
    return goal


__all__ = [
    "GoalRefused",
    "confirm",
    "close",
    "create_draft",
    "get_active",
    "is_user_close",
    "list_for_space",
    "outcome_kind",
    "pause",
    "resume",
    "to_out",
    "update",
]
