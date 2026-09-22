"""free-course: the teaching session's own row

Single-head revision chained onto the knowledge-items migration
(b7c8d9e0f1a2), which is this branch's head. Additive — one new table, nothing
touched:

  - free_course_sessions: one run through one chapter's teaching session.
    plan_json holds the whole teaching plan (it GROWS: every re-teach and every
    interrupt reply appends a step), transcript_json holds what the learner did
    at each stopping point, cursor is where they got to.

Why a table at all: the session stops and waits for the learner, so "Stop" has
to be able to abandon the beat that is playing, "I don't understand" has to know
what was already said, and a refresh must not restart the lecture. JSONB rather
than normalized steps because a step is a teaching beat, not something anything
joins on — normalizing would cost a migration per prompt change and buy nothing.

Revision ID: f1c4a7b2e9d3
Revises: b7c8d9e0f1a2
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f1c4a7b2e9d3"
down_revision: Union[str, Sequence[str], None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "free_course_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chapter_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "status", sa.String(), nullable=False, server_default="active"
        ),
        sa.Column("cursor", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("plan_json", postgresql.JSONB(), nullable=False),
        sa.Column(
            "transcript_json",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["chapter_id"],
            ["course_chapters.id"],
            name="free_course_sessions_chapter_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_free_course_sessions_chapter_id",
        "free_course_sessions",
        ["chapter_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_free_course_sessions_chapter_id", table_name="free_course_sessions"
    )
    op.drop_table("free_course_sessions")
