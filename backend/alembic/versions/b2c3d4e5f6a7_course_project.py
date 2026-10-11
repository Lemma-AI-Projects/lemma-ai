"""Let a course name the Learn Space it belongs to.

Evidence needs a scope, and `evidence_entry.project_from_scope` accepts exactly
one form: `space:<project_id>`. It refuses anything else rather than guessing,
because a row written against the wrong space is indistinguishable from a
correct one afterwards — it would show up as knowledge the learner does not have,
in a space they were never in.

Courses had no such column, so a practice result from a course had nowhere
honest to go. Adding it here is smaller than the alternative: without it, the
only way to make the pipeline write anything is to borrow an unrelated space,
which is the exact thing the practice contract forbids.

**No backfill.** The existing courses cannot honestly say which space they
belong to, so `NULL` stays the correct value for all of them. A backfill that
filled something in to make a test pass would be the same error, one layer down.

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision: str = "b2c3d4e5f6a7"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column(
        "courses",
        sa.Column(
            "project_id",
            sa.UUID(),
            sa.ForeignKey("projects.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_courses_project_id", "courses", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_courses_project_id", table_name="courses")
    op.drop_column("courses", "project_id")