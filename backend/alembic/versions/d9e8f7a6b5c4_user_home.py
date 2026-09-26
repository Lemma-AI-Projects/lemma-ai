"""user_home: the Global User Layer (about me / interests / how I work)

Also the point where this branch's migration graph becomes single-headed again.
`bf78c3ada3e8` (the empty merge commit for the two lines) only chains off
`a3b4c5d6e7f8`, so the question-bank line's tip `b3da7b4eccfe` stayed a second
head — and `alembic upgrade head` refuses to run at all while two exist. This
revision therefore names BOTH tips as parents, which is what actually closes the
graph. Its own upgrade only adds Home's tables.

Additive — no existing row changes meaning, and nothing is backfilled. An
account with no Home row is the honest state: we know nothing about that person,
which is exactly what every existing account is.

  - user_home: the single-valued half (language, background). One row per user.
  - user_home_items: interests and teaching preferences, confirmed or still a
    proposal. `status`/`origin` are what make "the agent may not write Home
    silently" checkable in SQL instead of a convention.
  - space_preferences: the middle layer of the override chain
    (conversation > space > home). Its own table on purpose: a space must be
    able to disagree with Home without rewriting it.

Deliberately absent: any mastery, progress, or behavioural counter (that is
Learner State / course progress), any similarity or embedding (no ranking in
V0), and any per-space scoping inside Home.

Scope: Home is global and it is the ONLY global user store. See
`.workbuddy/research/user-profile-v0-ownership-map.md`.

Revision ID: d9e8f7a6b5c4
Revises: bf78c3ada3e8, b3da7b4eccfe
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d9e8f7a6b5c4"
down_revision: Union[str, Sequence[str], None] = ("bf78c3ada3e8", "b3da7b4eccfe")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_home",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("language", sa.String(length=32), nullable=True),
        sa.Column("background", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        # CASCADE: Home without its person is meaningless, and the PK is the
        # person, so there is never a row to orphan.
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["profiles.id"],
            name="user_home_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", name="user_home_pkey"),
    )

    op.create_table(
        "user_home_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column(
            "status", sa.String(length=16), server_default="confirmed", nullable=False
        ),
        sa.Column(
            "origin", sa.String(length=16), server_default="user", nullable=False
        ),
        sa.Column(
            "source_conversation_id", postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.Column("source_space_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "confirmed_at", postgresql.TIMESTAMP(timezone=True), nullable=True
        ),
        sa.CheckConstraint(
            "length(btrim(text)) > 0", name="ck_user_home_items_text_not_blank"
        ),
        # SET NULL on both provenance columns: deleting the conversation or the
        # space must not delete what the learner confirmed about themselves.
        sa.ForeignKeyConstraint(
            ["source_conversation_id"],
            ["ai_conversations.id"],
            name="user_home_items_source_conversation_id_fkey",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["source_space_id"],
            ["projects.id"],
            name="user_home_items_source_space_id_fkey",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["profiles.id"],
            name="user_home_items_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="user_home_items_pkey"),
    )
    op.create_index(
        "ix_user_home_items_user_kind_status",
        "user_home_items",
        ["user_id", "kind", "status"],
    )

    op.create_table(
        "space_preferences",
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
            "length(btrim(text)) > 0", name="ck_space_preferences_text_not_blank"
        ),
        sa.ForeignKeyConstraint(
            ["source_conversation_id"],
            ["ai_conversations.id"],
            name="space_preferences_source_conversation_id_fkey",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name="space_preferences_project_id_fkey",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["profiles.id"],
            name="space_preferences_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="space_preferences_pkey"),
    )
    op.create_index(
        "ix_space_preferences_project_created",
        "space_preferences",
        ["project_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_space_preferences_project_created", table_name="space_preferences"
    )
    op.drop_table("space_preferences")
    op.drop_index("ix_user_home_items_user_kind_status", table_name="user_home_items")
    op.drop_table("user_home_items")
    op.drop_table("user_home")
