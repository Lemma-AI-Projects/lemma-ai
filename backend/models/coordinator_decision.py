"""Coordinator decisions: the record of what the system decided, and why.

One row per decision. This table exists for exactly one reason: the Coordinator
is allowed to interrupt a learner, and an interruption nobody can explain
afterwards is worse than no interruption. Every row carries the event it was
reacting to, the decision it produced, the reason in words, and what the executor
actually did — which is the minimum needed to answer "why did the system tell me
this?" months later.

It is NOT a queue and NOT state: nothing reads this table to decide anything. The
next decision is computed from Learner State, never from the last decision — a
decision layer that read its own log would start compounding its own mistakes.

Deliberately absent: `consumed_at`, `status`, `superseded_by`. V0 produces a
decision and records it; whether some executor later "used" it is V1's business
(and would need a lifecycle, which is exactly the complexity the brief forbids
here). The Learner State at decision time is also NOT copied in: it is derived
data, and this repo's rule is that derived state is never cached beside its
inputs. The reason string states the facts that mattered; the rest is
recomputable.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class CoordinatorDecision(Base):
    """One decision, as it was made."""

    __tablename__ = "coordinator_decisions"
    __table_args__ = (
        # The panel's read: this user's decisions, newest first — and, filtered,
        # one space's decisions.
        Index("ix_coordinator_decisions_user_created", "user_id", "created_at"),
        Index("ix_coordinator_decisions_project_created", "project_id", "created_at"),
        CheckConstraint(
            "length(btrim(reason)) > 0",
            name="ck_coordinator_decisions_reason_not_blank",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    # Nullable on purpose: an event that belongs to no space still gets a
    # decision (usually NO_ACTION), and that is worth recording rather than
    # dropping. CASCADE because a decision about a deleted space is not a fact
    # about anything any more.
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=True,
    )
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    event_payload: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )
    action: Mapped[str] = mapped_column(String, nullable=False)
    target: Mapped[str | None] = mapped_column(Text, nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    urgency: Mapped[str] = mapped_column(String, nullable=False)
    # What the executor did with it: "nothing_to_do" / "handed_to_global_agent" /
    # "notification_sent" / a failure note. Free text because it describes an
    # action, and inventing a closed set for it would be inventing a lifecycle.
    effect: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
