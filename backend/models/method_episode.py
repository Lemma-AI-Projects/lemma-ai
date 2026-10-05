"""Method Episode: one promise about a stretch of work, and what became of it.

A Method is a claim on the learner — "ask him to try, don't hand over the
answer, and two unassisted correct answers mean it worked". Today that claim is
true for exactly one turn (`ai_conversations.method` is a string on a thread,
and a thread is not a unit of work). This table is that unit.

Why it has to be a row and not a column:

  * **The five exits need somewhere to land.** Achieved and not-achieved leave
    evidence today; *paused* leaves nothing, *switched* overwrites one string,
    and *rediagnosed* has nowhere at all. A design that claims to end an
    intervention cannot end it in three of five ways.
  * **A thread is the wrong scale.** "继续上次" is not a comfort feature — it is
    the difference between a promise and a suggestion.
  * **The declared target is a snapshot.** `purpose` changes what counts as done
    (see `ai/methods/types.py`), so a goal edited mid-episode must not silently
    rewrite what the earlier one promised. Hence `goal_purpose` beside the rule.

Five decisions worth keeping:

  * **No start time is used for timing.** Completion is judged from evidence
    alone (`ai/methods/completion.py`), which is what lets the check be
    recomputed from the table at any time. A stored duration invites someone to
    time out an episode, and a timeout is a decision nothing in the evidence
    supports.
  * **`method` has no foreign key.** Methods are discovered at boot from a
    directory and can be removed; an episode must survive that, because the
    fact "we promised this and then it was uninstalled" is exactly the kind you
    want to still be able to read.
  * **The criterion and its plain-language form are stored together.**
    `completion_rule` is the check, `commitment` is what the learner was told.
    Split, they drift, and "we told him two and then counted one" becomes
    undetectable.
  * **No copy of Learner State.** Derived data is never cached beside its
    inputs — the same rule `models/coordinator_decision.py` states.
  * **No `superseded_by` / second state machine.** Closing an episode is closing
    it. Restoring one is V1's business and would need a lifecycle to be honest.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base

#: An episode is `active` from the moment it is opened until one of the five
#: exits applies. `achieved` and `not_achieved` are decided **by evidence**, not
#: by the clock; `paused` is the learner walking away; `switched` and
#: `rediagnosed` are the system changing its mind, and both must say why.
EPISODE_STATUSES = (
    "active",
    "achieved",
    "not_achieved",
    "paused",
    "switched",
    "rediagnosed",
)

#: The exits that require `exit_reason`. A silent change and a random change look
#: identical afterwards, and "why am I being taught this differently now" is a
#: question the learner is entitled to ask.
EXITS_THAT_MUST_EXPLAIN = ("switched", "rediagnosed")


class MethodEpisode(Base):
    """One stretch of work under one Method, in one space."""

    __tablename__ = "method_episodes"
    __table_args__ = (
        # The two reads that exist: a space's current episode (also covered by
        # the partial unique index below), and a space's episodes over time.
        Index("ix_method_episodes_project_status", "project_id", "status"),
        Index("ix_method_episodes_conversation", "conversation_id", "opened_at"),
        # At most one ACTIVE episode per space. Closed rows are unconstrained:
        # several may pile up, which is what makes "finish this, start the next"
        # cost nothing. Enforced here rather than in the service so a bug cannot
        # leave two running — and a second `active` is a fact about the world
        # that must not exist, not an error to swallow.
        Index(
            "uq_method_episodes_active_per_project",
            "project_id",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
        CheckConstraint(
            "status in ('achieved', 'not_achieved', 'paused', 'switched', "
            "'rediagnosed', 'active')",
            name="ck_method_episodes_status",
        ),
        # A closed episode that changed its mind has to say why. `paused` does
        # not: the learner leaving is not a decision anybody made.
        CheckConstraint(
            "(status not in ('switched', 'rediagnosed')) "
            "or (exit_reason is not null and length(btrim(exit_reason)) > 0)",
            name="ck_method_episodes_exit_reason",
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
    # Denormalised, like every other table in this schema: the IDOR rule ("only
    # mine") should not need a join on every read.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    # SET NULL, not CASCADE: deleting the conversation must not silently erase
    # the fact that we made a promise in it. Same reasoning as
    # `space_memories.source_conversation_id`.
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai_conversations.id", ondelete="SET NULL"),
        nullable=True,
    )

    #: Plain name, deliberately not a foreign key — see the module docstring.
    method: Mapped[str] = mapped_column(String, nullable=False)
    #: The goal's purpose **at the time**. Completion depends on it, so a goal
    #: edited mid-episode must not retroactively change what was promised.
    goal_purpose: Mapped[str | None] = mapped_column(String, nullable=True)
    #: Which knowledge item this stretch is about. Null is legitimate: a space
    #: with no structure has nothing to point at, and the method already says so.
    focus_label: Mapped[str | None] = mapped_column(Text, nullable=True)
    #: What the learner was told, in the method's own words. The audit trail's
    #: human-readable half.
    commitment: Mapped[str] = mapped_column(Text, nullable=False)

    #: The declared observation target, snapshotted. After the fact this answers
    #: "what was it watching for" without re-running the method.
    evidence_target: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )
    #: The machine half of "what counts as done", snapshotted for the same
    #: reason. Together with `commitment` this is one promise in two shapes.
    completion_rule: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )

    status: Mapped[str] = mapped_column(
        String, nullable=False, server_default="active"
    )
    #: Required by the CHECK for `switched` / `rediagnosed`; null otherwise.
    exit_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    #: Set when it opens, cleared when it closes. **Never used to judge anything**
    #: — see the module docstring.
    opened_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    closed_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
