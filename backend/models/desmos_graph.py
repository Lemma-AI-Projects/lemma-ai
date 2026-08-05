import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class DesmosGraph(Base):
    """An AI-drawn, user-editable Desmos graph (对话插件工具的第一个领域表).

    Chat messages hold only a thin reference ({"type":"desmos_graph","graphId"}
    in ai_messages.tool_json — the message is immutable); the graph itself is
    MUTABLE state and lives here so user edits have a PATCH target.

    Three JSON columns, three truths (出生证 / 人生 / 读回):
    - ai_params_json: the validated AI spec that created the graph. Immutable
      after creation — the frontend's reset anchor (setDefaultState) and the
      fallback snapshot when the user never edited.
    - state_json: the OFFICIAL opaque calculator state (getState()) saved after
      user edits. Desmos warns states must never be hand-built, so the AI never
      produces this — only the real calculator does.
    - expressions_json: a readable expression snapshot (getExpressions())
      extracted alongside state_json — the read_current_graph tool's data
      source, because the opaque state is useless to the model.

    conversation_id is NULLABLE: on a NEW conversation's first turn the
    conversation row doesn't exist yet (persist_turn writes it after the first
    token — course_planning precedent), so the graph is created unlinked and
    the message tool_json remains the authoritative link. Deleting a
    conversation CASCADE-deletes its linked graphs; first-turn orphans are
    accepted as negligible and swept by cleanup jobs alongside stale drafts.
    """

    __tablename__ = "desmos_graphs"
    __table_args__ = (
        CheckConstraint("kind in ('2d', '3d')", name="ck_desmos_graphs_kind"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Which calculator renders this graph (2d -> GraphingCalculator, 3d ->
    # Calculator3D). Self-describing so read_current_graph can tell the model
    # which render tool matches, and the card doesn't depend on tool_json.
    kind: Mapped[str] = mapped_column(String, nullable=False, server_default="2d")
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai_conversations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    ai_params_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    state_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    expressions_json: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSONB, nullable=True
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
