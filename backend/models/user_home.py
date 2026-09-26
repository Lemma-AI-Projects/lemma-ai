"""User Home: the one layer that follows the learner from space to space.

Every other store in this codebase is scoped to something smaller than the
person: `space_memories` and `knowledge_*` belong to one Learn Space,
`ai_conversations.*` belongs to one conversation, `courses.tuning_json` belongs
to one course. That is the right shape for each of them — but it leaves the
product with no answer to "what do we know about this person, everywhere?", and
in practice that answer had been quietly accumulating in the wrong places (a
study preference living inside one course's intake answers, the language the
learner reads in living only in the browser).

This module is that missing layer, and nothing more. Three tables, one owner
each:

  - `user_home` — the single-valued facts: which language they read in, and their
    background. One row per user, created on first write.
  - `user_home_items` — the list-shaped facts: interests, and how they like to be
    taught. Both are "a short phrase the learner owns", so they share one table
    and one lifecycle; `kind` tells them apart.
  - `space_preferences` — deliberately NOT in Home. A space's preference is the
    middle layer of the override chain (conversation > space > home) and it must
    be able to disagree with Home without changing it. Keeping it in the same
    table as Home would make that impossible to enforce.

Boundaries this file is responsible for keeping (see
`.workbuddy/research/user-profile-v0-ownership-map.md` for the audit behind it):

  - **Home is global.** A row here is readable from every space and every
    conversation; that is the whole point, and it is why nothing space-scoped is
    copied in.
  - **Home is not Learner State.** Nothing here says what the learner can do.
    Mastery is derived from `knowledge_evidence` and stays derived.
  - **Home is not Space Memory.** "What happened in this space" is continuity,
    not identity.
  - **Nothing writes Home silently.** Rows are either typed by the learner, or
    proposed by the agent as a `candidate` and flipped to `confirmed` by an
    explicit user action. `status` and `origin` exist so that rule is
    enforceable in SQL rather than by convention.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base

#: The two list-shaped sections of Home. Same lifecycle, different question.
HOME_ITEM_KINDS = ("interest", "preference")

#: `candidate` = proposed, visible to the user, never used in a prompt.
HOME_ITEM_STATUSES = ("candidate", "confirmed")

#: Who put the text there. `agent` rows never become confirmed on their own.
HOME_ITEM_ORIGINS = ("user", "agent")


class UserHome(Base):
    """The single-valued half of Home. One row per user, created on first write.

    No row means "we know nothing about this person yet" — which is the honest
    state for every existing account, so there is nothing to backfill.
    """

    __tablename__ = "user_home"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        primary_key=True,
    )
    #: Language code the learner wants to be taught in (`zh` / `en`). Stored as a
    #: short code rather than a display label so the prompt and the frontend can
    #: both use it without parsing prose.
    language: Mapped[str | None] = mapped_column(String(32), nullable=True)
    #: Free text on purpose: "high school", "本科·计算机", "转行的后端工程师"
    #: are all true and none of them fit an enum we would have to invent today.
    background: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class UserHomeItem(Base):
    """One line of Home: an interest, or a preference about how to be taught.

    Candidates live in this same table rather than a staging one, because a
    candidate IS this row before the user says yes — same text, same kind, same
    owner. Confirming is therefore a one-column update, and there is no window
    where a proposal exists in two shapes.
    """

    __tablename__ = "user_home_items"
    __table_args__ = (
        # The only hot query: this user's confirmed items of one kind.
        Index("ix_user_home_items_user_kind_status", "user_id", "kind", "status"),
        CheckConstraint(
            "length(btrim(text)) > 0", name="ck_user_home_items_text_not_blank"
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
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default="confirmed"
    )
    origin: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default="user"
    )
    #: Where a proposal came from, so the confirmation card can say "in the
    #: conversation about X". SET NULL, not CASCADE: deleting a conversation must
    #: not delete what the learner confirmed.
    source_conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai_conversations.id", ondelete="SET NULL"),
        nullable=True,
    )
    source_space_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    #: When the learner said yes. NULL while it is still a proposal — the one
    #: column a reader can trust to separate "we know this" from "we guessed it".
    confirmed_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )


class SpacePreference(Base):
    """The middle layer of the override chain: how to teach *in this space*.

    It exists as its own table rather than as a Home row with a scope column for
    one reason: the isolation requirement is that a space can ask for detailed
    explanations while Home asks for concise ones, and neither may rewrite the
    other. One row per statement, owned by a project, readable only inside it.
    """

    __tablename__ = "space_preferences"
    __table_args__ = (
        Index("ix_space_preferences_project_created", "project_id", "created_at"),
        CheckConstraint(
            "length(btrim(text)) > 0", name="ck_space_preferences_text_not_blank"
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
    #: Denormalised owner, matching `space_memories`: the "only mine" rule should
    #: not need a join on every read.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    source_conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai_conversations.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
