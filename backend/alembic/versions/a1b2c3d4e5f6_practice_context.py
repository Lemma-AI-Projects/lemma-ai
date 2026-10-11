"""Let a practice set say where it came from.

The Question Bank was created for one caller: a developer. `origin_kind` was
CHECKed to `'dev'` at the database level, which meant no product surface could
ever build a set — not Free Course, not a daily quiz, not a Learn Space.

This widens the CHECK instead of dropping it, and adds the two columns that
answer "which learning experience was this, and what triggered it". Both are
nullable, so every existing row keeps working untouched.

⚠️ **What is deliberately not here:** a `project_id` foreign key. The audit
found that a question cannot currently belong to a space, and that is the real
gap — but adding an FK to `projects` here would couple the bank to Learn Space
before anything can create a space-scoped set, and a nullable column that
nothing writes is worse than an absent one. It waits for the first surface that
needs it.

Revision ID: a1b2c3d4e5f6
Revises: f1c2d3e4a5b6
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "f1c2d3e4a5b6"
branch_labels: str | None = None
depends_on: str | None = None


#: Where a practice was triggered from. This is the vocabulary the product
#: already uses in conversation — Subcourse, on-demand, daily, Learn Space — and
#: keeping it as one column rather than four tables is the point: a trigger
#: context is an attribute of an activity, not a kind of activity.
CONTEXT_KINDS = ("subcourse", "on_demand", "daily", "learn_space", "manual")

#: Replaces the `('dev')` check. `dev` stays first and stays valid: rows written
#: before this migration must keep passing.
ORIGIN_KINDS = ("dev", "subcourse", "on_demand", "daily", "learn_space", "manual")


def upgrade() -> None:
    op.drop_constraint(
        "ck_question_sets_origin_kind", "question_sets", type_="check"
    )
    op.create_check_constraint(
        "ck_question_sets_origin_kind",
        "question_sets",
        "origin_kind in (%s)" % ", ".join(f"'{k}'" for k in ORIGIN_KINDS),
    )

    op.add_column("question_sets", sa.Column("context_kind", sa.String(), nullable=True))
    op.add_column("question_sets", sa.Column("context_ref", sa.String(), nullable=True))
    op.create_check_constraint(
        "ck_question_sets_context_kind",
        "question_sets",
        "context_kind is null or context_kind in (%s)"
        % ", ".join(f"'{k}'" for k in CONTEXT_KINDS),
    )


def downgrade() -> None:
    op.drop_constraint("ck_question_sets_context_kind", "question_sets", type_="check")
    op.drop_column("question_sets", "context_ref")
    op.drop_column("question_sets", "context_kind")

    # Narrowing back to `dev` would fail if anything but dev rows exist, which is
    # the correct behaviour: a downgrade that silently discards rows is not a
    # downgrade. The CHECK does it for us.
    op.drop_constraint(
        "ck_question_sets_origin_kind", "question_sets", type_="check"
    )
    op.create_check_constraint(
        "ck_question_sets_origin_kind", "question_sets", "origin_kind in ('dev')"
    )