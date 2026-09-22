"""Space Memory: what happened in this Learn Space that is worth remembering.

One table, five columns, and the shape carries the whole design:

  - `project_id` (the SPACE), not a conversation — that single choice is what
    makes memory continue across conversations. A memory attached to a
    conversation would be chat history, not memory.
  - `text` is plain prose, written by the Agent at the moment it mattered. No
    kind, no score, no embedding, no expiry: V0's retrieval is "the most recent
    N", and every extra column would imply a ranking that does not exist yet
    (see planning/space-memory-v0-execution-plan.md §7 for the non-goals).
  - `source_conversation_id` is provenance, so the panel can say which
    conversation a memory came from. SET NULL, not CASCADE: deleting the
    conversation must not silently erase what the space learned.

Scope boundary this table must never blur (README §六, red lines 6/7/8):
memory serves CONTINUITY, not knowledge modelling. It carries no mastery, no
numbers, and is never usable as evidence for the Learner State tables — an
"we decided X" line is not an observation about what the learner can do.
"""

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text, func
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class SpaceMemory(Base):
    """One thing this space remembers, written by the Global Agent."""

    __tablename__ = "space_memories"
    __table_args__ = (
        # The only query V0 makes: this space's memories, newest first.
        Index("ix_space_memories_project_created", "project_id", "created_at"),
        CheckConstraint(
            "length(btrim(text)) > 0", name="ck_space_memories_text_not_blank"
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
    # Matches ai_conversations: the owner is denormalised here so the IDOR rule
    # ("only mine") does not need a join on every read.
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
