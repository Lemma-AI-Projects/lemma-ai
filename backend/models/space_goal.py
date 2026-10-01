"""Space Goal: why this Learn Space exists.

A space is not a folder. It is somebody working towards something over weeks, so
the first thing the system needs is the direction — otherwise every decision it
makes is locally reasonable and globally arbitrary. This table holds that
direction, and nothing else.

Four decisions worth keeping:

  * **It belongs to the SPACE, not to the person.** `user_home` already owns the
    cross-space layer and its kinds are `interest` / `preference` (see
    `models/user_home.py`) — it deliberately has no goal. The two lifecycles are
    different: a preference follows you between spaces and never expires, a goal
    is bound to one situation and has an end. Putting a goal in `user_home`
    would mean one of them has to pretend to be the other.
  * **`deadline_at` is optional, and `target_text` is not a number.** "117 in
    two months" and "actually understand linear algebra" are both goals; a
    shape that forces every goal to have a date and a value cannot hold the
    second one at all. So the value is text, and the date may be absent.
  * **`purpose` is the load-bearing field.** It decides what "success" means,
    and therefore whether two turns are the same kind of turn: "get the exam
    right" and "understand why it works" are not the same instruction even
    though they can point at the same topic.
  * **There is no `achieved` / `failed`.** For a goal whose result only the
    learner can see (an exam score), the system is not entitled to declare
    anything about attainment — it may only decide whether *it* still has a
    reason to act. So `status` says what the system is doing, and the reason a
    goal closed carries who closed it (`system_*` vs `user_*`). See
    `ai/coordinator/types.py` for where that distinction is consumed.

`outcome_kind` (whether the result is externally reported or system-observable)
is deliberately NOT a column: it is a total function of `purpose` today, and a
stored copy would be a second source of truth for the same fact. It is derived
in `services/space_goal_service.py`.
"""

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, func, text
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base

#: `draft` is the only state a goal can be created in, and it is not a formality:
#: a goal that drives ranking and termination must be one the learner actually
#: confirmed. `active`/`paused`/`closed` all imply "the learner said yes".
GOAL_STATUSES = ("draft", "active", "paused", "closed")

#: What the goal is *for*. `other` is a real value, not a fallback — the moment
#: a goal exists that fits none of the three, forcing it into one is worse than
#: admitting the vocabulary is incomplete.
GOAL_PURPOSES = ("exam_performance", "understanding", "build_something", "other")

#: Who put it there. Only `agent_proposed` may stay unconfirmed; the other two
#: come from the learner saying or typing it.
GOAL_ORIGINS = ("user_stated", "user_entered", "agent_proposed")

#: Why a goal is no longer being pushed. The prefix is the point: `system_*` is
#: the system's own judgement and may be overturned by new evidence; `user_*` is
#: the learner's decision and may not.
GOAL_CLOSE_REASONS = (
    "system_no_further_value",
    "user_achieved",
    "user_abandoned",
    "user_superseded",
)


class SpaceGoal(Base):
    """One goal cycle of one space."""

    __tablename__ = "space_goals"
    __table_args__ = (
        # The two reads that exist: the active goal of a space (also covered by
        # the partial unique index below), and a space's goals over time.
        Index("ix_space_goals_project_status", "project_id", "status"),
        Index("ix_space_goals_user_created", "user_id", "created_at"),
        # At most one ACTIVE goal per space. `draft`/`paused`/`closed` rows are
        # unconstrained: several may pile up over a space's life, which is what
        # makes "close this one, start the next" cost nothing.
        Index(
            "uq_space_goals_active_per_project",
            "project_id",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
        CheckConstraint(
            "status in ('draft', 'active', 'paused', 'closed')",
            name="ck_space_goals_status",
        ),
        CheckConstraint(
            "purpose in ('exam_performance', 'understanding', 'build_something', 'other')",
            name="ck_space_goals_purpose",
        ),
        CheckConstraint(
            "origin in ('user_stated', 'user_entered', 'agent_proposed')",
            name="ck_space_goals_origin",
        ),
        CheckConstraint(
            "closed_reason in ('system_no_further_value', 'user_achieved', "
            "'user_abandoned', 'user_superseded')",
            name="ck_space_goals_closed_reason_value",
        ),
        CheckConstraint(
            "length(btrim(target_text)) > 0",
            name="ck_space_goals_target_text_not_blank",
        ),
        # "Closed" without a reason is the state this whole design exists to
        # avoid: an unexplained stop. Enforced here rather than by convention.
        CheckConstraint(
            "(status = 'closed') = (closed_reason is not null)",
            name="ck_space_goals_close_reason_present",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    # Denormalised like `space_memories`: the owner is on the row so the
    # "only mine" check needs no join.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    #: The learner's own words for where they want to get to. Text, not a number:
    #: "117" and "actually understand it" are both goals, and only one of them
    #: is numeric.
    target_text: Mapped[str] = mapped_column(Text, nullable=False)
    #: Optional on purpose — "understand linear algebra properly" has no date
    #: and is still a complete goal. When present it is a *fact about context*,
    #: never a trigger (see the Scheduler's own docstring on why).
    deadline_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    #: The domain or setting the goal lives in (e.g. "TOEFL"). Free text; the
    #: extraction usually fills it, and nothing branches on it.
    context: Mapped[str | None] = mapped_column(Text, nullable=True)
    #: What success means. See the module docstring.
    purpose: Mapped[str] = mapped_column(String, nullable=False)
    origin: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(
        String, nullable=False, server_default="draft"
    )
    #: Set when the learner confirms. `draft` rows never have one, and only
    #: `active` rows are ever read by a decision.
    confirmed_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    #: Required iff `status = 'closed'` (CHECK above). Its prefix says who closed
    #: it, which is the difference between "the system sees no reason to go on"
    #: and "the learner says they are done".
    closed_reason: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
