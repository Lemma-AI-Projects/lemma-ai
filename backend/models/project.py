import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class Project(Base):
    """Learn space: a component collection (boards / conversations / goals...)
    plus a bound companion agent (persona injected via the C1 channel).

    Kept deliberately minimal: icon/color, custom instructions and archive
    flags are known future candidates but wait for real product need. The
    agent columns are nullable so pre-onboarding rows simply have no teacher.
    """

    __tablename__ = "projects"
    # Sidebar query is WHERE user_id ORDER BY updated_at DESC.
    __table_args__ = (
        Index("ix_projects_user_id_updated_at", "user_id", "updated_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    # ── Bound companion agent (learn space onboarding v1) ────────────────
    # Persona fields generated at onboarding (or edited by the user), injected
    # into every conversation of this space via lemma_context_blocks (C1).
    # Nullable: rows created before onboarding have no teacher yet.
    agent_name: Mapped[str | None] = mapped_column(String, nullable=True)
    agent_personality: Mapped[str | None] = mapped_column(Text, nullable=True)
    agent_teaching_style: Mapped[str | None] = mapped_column(Text, nullable=True)
    agent_welcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Full SOUL.md persona document (onboarding "直接编辑 SOUL.md" path).
    # When present, it is the authoritative persona injected via C1; the
    # individual fields above remain for UI display / list rendering.
    agent_soul_md: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
