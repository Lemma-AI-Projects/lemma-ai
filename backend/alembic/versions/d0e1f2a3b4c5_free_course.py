"""free-course: courses.mode / chapter objective+blueprint + lesson object tables

Single-head revision chained onto the roster migration (c1d2e3f4a5b6), which is
this branch's head. Additive:
  - courses.mode ('video' | 'free', default 'video') so the two pipelines that
    share the course tree can be told apart (a free course must never open the
    video player and vice versa).
  - course_chapters.objective + blueprint_json for the free-course map node.
  - course_lesson_objects / course_lesson_observations: content + observations.

Existing rows are untouched: mode defaults to 'video' for every current course.

Revision ID: d0e1f2a3b4c5
Revises: c1d2e3f4a5b6
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "d0e1f2a3b4c5"
down_revision: Union[str, Sequence[str], None] = "c1d2e3f4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "courses",
        sa.Column("mode", sa.String(), nullable=False, server_default="video"),
    )
    op.create_check_constraint(
        "ck_courses_mode", "courses", "mode in ('video', 'free')"
    )
    op.add_column(
        "course_chapters", sa.Column("objective", sa.Text(), nullable=True)
    )
    op.add_column(
        "course_chapters",
        sa.Column(
            "blueprint_json", sa.dialects.postgresql.JSONB(), nullable=True
        ),
    )

    op.create_table(
        "course_lesson_objects",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "chapter_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("course_chapters.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("concept", sa.String(), nullable=True),
        sa.Column(
            "difficulty", sa.String(), nullable=False, server_default="core"
        ),
        sa.Column(
            "payload_json", sa.dialects.postgresql.JSONB(), nullable=True
        ),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_course_lesson_objects_chapter_order",
        "course_lesson_objects",
        ["chapter_id", "order_index"],
    )

    op.create_table(
        "course_lesson_observations",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "object_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("course_lesson_objects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "kind", sa.String(), nullable=False, server_default="answer"
        ),
        sa.Column(
            "response_json", sa.dialects.postgresql.JSONB(), nullable=True
        ),
        sa.Column("verdict", sa.String(), nullable=True),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_course_lesson_observations_object_id",
        "course_lesson_observations",
        ["object_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_course_lesson_observations_object_id", "course_lesson_observations"
    )
    op.drop_table("course_lesson_observations")
    op.drop_index(
        "ix_course_lesson_objects_chapter_order", "course_lesson_objects"
    )
    op.drop_table("course_lesson_objects")
    op.drop_column("course_chapters", "blueprint_json")
    op.drop_column("course_chapters", "objective")
    op.drop_constraint("ck_courses_mode", "courses", type_="check")
    op.drop_column("courses", "mode")