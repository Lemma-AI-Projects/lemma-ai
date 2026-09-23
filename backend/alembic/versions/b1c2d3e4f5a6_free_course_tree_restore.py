"""free-course: bring back the tree and the tables this branch removed

main-v3 dropped the free-course host on purpose, twice over:

  - `c3f1a9b2d5e7_course_four_level_rebuild` rebuilt the course domain as
    modules -> lessons -> points and dropped `course_units` / `course_chapters`;
  - `e6f1a3c8b2d7_drop_main_v2_leftovers` dropped `courses.mode` and
    `courses.tuning_json`.

That was the right call for the video pipeline, which now models a lesson as a
bag of points bound to real videos. It was also the reason Free Course could not
exist here at all: a free course's lesson holds *content objects*
(explanation / example / practice / assessment), and a point — which is a video —
has nowhere to put one.

This migration is the deliberate reversal, and it is **additive only**: nothing
is dropped, nothing existing is rewritten. The video pipeline keeps using
modules/lessons/points and never reads anything created here; `courses.mode`
is what tells the two apart (default `video`, so every existing row is
unaffected).

  - courses.mode ('video' | 'free', default 'video') + its CHECK
  - courses.tuning_json  — free-course per-course tuning (volume/depth/focus/pace)
  - course_units / course_chapters — the free-course tree
  - course_lesson_objects / course_lesson_observations — content + answers

Two columns the old `course_chapters` carried are deliberately NOT restored:
`chosen_candidate_id` (the video pipeline's pick, now on points) and `progress`
(a video-watch counter). The table now serves one pipeline, and a column nothing
writes is a lie about what the schema means.

Revision ID: b1c2d3e4f5a6
Revises: f8b9c0d1e2f3
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "f8b9c0d1e2f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- the pipeline discriminator, back ---------------------------------
    op.execute(
        "ALTER TABLE courses ADD COLUMN IF NOT EXISTS mode VARCHAR "
        "NOT NULL DEFAULT 'video'"
    )
    op.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS tuning_json JSONB")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'ck_courses_mode'
            ) THEN
                ALTER TABLE courses
                    ADD CONSTRAINT ck_courses_mode
                    CHECK (mode IN ('video', 'free'));
            END IF;
        END $$;
        """
    )

    # --- the free-course tree ---------------------------------------------
    op.create_table(
        "course_units",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("overview", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["course_id"],
            ["courses.id"],
            name="course_units_course_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_course_units_course_id_order_index",
        "course_units",
        ["course_id", "order_index"],
    )

    op.create_table(
        "course_chapters",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("unit_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("objective", sa.Text(), nullable=True),
        sa.Column("blueprint_json", postgresql.JSONB(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["unit_id"],
            ["course_units.id"],
            name="course_chapters_unit_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "status in ('not_started', 'researching', 'ready', 'failed')",
            name="ck_course_chapters_status",
        ),
    )
    op.create_index(
        "ix_course_chapters_unit_id_order_index",
        "course_chapters",
        ["unit_id", "order_index"],
    )

    op.create_table(
        "course_lesson_objects",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chapter_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("concept", sa.String(), nullable=True),
        sa.Column(
            "difficulty", sa.String(), nullable=False, server_default="core"
        ),
        sa.Column("payload_json", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["chapter_id"],
            ["course_chapters.id"],
            name="course_lesson_objects_chapter_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_course_lesson_objects_chapter_order",
        "course_lesson_objects",
        ["chapter_id", "order_index"],
    )

    op.create_table(
        "course_lesson_observations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("object_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "kind", sa.String(), nullable=False, server_default="answer"
        ),
        sa.Column("response_json", postgresql.JSONB(), nullable=True),
        sa.Column("verdict", sa.String(), nullable=True),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["object_id"],
            ["course_lesson_objects.id"],
            name="course_lesson_observations_object_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_course_lesson_observations_object_id",
        "course_lesson_observations",
        ["object_id"],
    )


def downgrade() -> None:
    """Back to this branch's own state: the free-course host puts itself away."""
    op.execute("DROP TABLE IF EXISTS course_lesson_observations CASCADE")
    op.execute("DROP TABLE IF EXISTS course_lesson_objects CASCADE")
    op.execute("DROP TABLE IF EXISTS course_chapters CASCADE")
    op.execute("DROP TABLE IF EXISTS course_units CASCADE")
    op.execute("ALTER TABLE courses DROP CONSTRAINT IF EXISTS ck_courses_mode")
    op.execute("ALTER TABLE courses DROP COLUMN IF EXISTS tuning_json")
    op.execute("ALTER TABLE courses DROP COLUMN IF EXISTS mode")
