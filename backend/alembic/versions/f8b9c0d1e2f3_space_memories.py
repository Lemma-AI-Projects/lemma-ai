"""space_memories: what this Learn Space remembers across conversations

Single-head revision for main-v3, chained onto e7a8b9c0d1e2 (messages' agent
context). Additive — no existing row changes meaning.

  - space_memories: one thing the space remembers, written by the Global Agent
    during a turn. Keyed by PROJECT (the space), not by conversation: that is
    the entire mechanism behind "continue across conversations".

Deliberately absent: kind, embedding, score, expires_at, superseded_by. V0's
retrieval is "the most recent N, verbatim" and it has no ranking; a column that
implies one would be a promise the code cannot keep (see
planning/space-memory-v0-execution-plan.md §1 and §7).

Scope: memory serves continuity, never knowledge modelling — it is plain text
with no numbers, and it is NOT usable as Learner State evidence.

Revision ID: f8b9c0d1e2f3
Revises: e7a8b9c0d1e2
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f8b9c0d1e2f3"
down_revision: Union[str, Sequence[str], None] = "e7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "space_memories",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column(
            "source_conversation_id", postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "length(btrim(text)) > 0", name="ck_space_memories_text_not_blank"
        ),
        # SET NULL, not CASCADE: deleting the conversation must not erase what
        # the space learned; memory outlives the chat that produced it.
        sa.ForeignKeyConstraint(
            ["source_conversation_id"],
            ["ai_conversations.id"],
            name="space_memories_source_conversation_id_fkey",
            ondelete="SET NULL",
        ),
        # CASCADE: a memory without its space is meaningless.
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name="space_memories_project_id_fkey",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["profiles.id"],
            name="space_memories_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="space_memories_pkey"),
    )
    op.create_index(
        "ix_space_memories_project_created",
        "space_memories",
        ["project_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_space_memories_project_created", table_name="space_memories")
    op.drop_table("space_memories")
