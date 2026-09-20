"""knowledge layer: items + prerequisite edges + evidence

Single-head revision for **main-v3**, chained onto f1a9c4e7d2b8 (payments).
Additive, no existing rows touched:
  - knowledge_items:    one granular topic per row (a knowledge item is a topic,
    not a question) belonging to one learn space (projects).
  - knowledge_edges:    the prerequisite partial order. Read as "being able to
    do to_item implies being able to do from_item". Must stay acyclic — the
    service layer checks; the DB cannot.
  - knowledge_evidence: one verifiable record of one interaction step,
    append-only, keyed by (project, user, created_at) and by item.

Deliberately absent: any state / mastery / learner-profile table. The learner's
state is a pure function of these three tables (ai/knowledge/state.py) and is
never persisted — deleting any evidence row must be able to change it.

Note on the chain: f1a9c4e7d2b8 (payments) was uncommitted work-in-progress in
this worktree when this revision was written. If that revision is renamed or
dropped, re-anchor this one onto whatever main-v3's head becomes — the three
tables do not depend on payments in any way.

See planning/learner-state-v1-execution-plan.md (B1) for the rationale.

Revision ID: c9d0e1f2a3b4
Revises: f1a9c4e7d2b8
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "c9d0e1f2a3b4"
down_revision: Union[str, Sequence[str], None] = "f1a9c4e7d2b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "knowledge_items",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False, server_default="concept"),
        sa.Column("source_ref", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column(
            "origin", sa.String(), nullable=False, server_default="agent_drafted"
        ),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "kind in ('concept', 'skill', 'problem_type')",
            name="ck_knowledge_items_kind",
        ),
        sa.CheckConstraint(
            "origin in ('agent_drafted', 'user_added', 'imported')",
            name="ck_knowledge_items_origin",
        ),
        sa.CheckConstraint(
            "status in ('active', 'retired')", name="ck_knowledge_items_status"
        ),
    )
    op.create_index(
        "ix_knowledge_items_project_status",
        "knowledge_items",
        ["project_id", "status"],
    )

    op.create_table(
        "knowledge_edges",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "from_item_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("knowledge_items.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "to_item_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("knowledge_items.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "confidence", sa.String(), nullable=False, server_default="agent_drafted"
        ),
        sa.Column(
            "counterexample_count", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "confidence in ('agent_drafted', 'user_confirmed')",
            name="ck_knowledge_edges_confidence",
        ),
        sa.CheckConstraint(
            "from_item_id <> to_item_id", name="ck_knowledge_edges_no_self_loop"
        ),
    )
    op.create_index("ix_knowledge_edges_project", "knowledge_edges", ["project_id"])
    op.create_index("ix_knowledge_edges_to_item", "knowledge_edges", ["to_item_id"])

    op.create_table(
        "knowledge_evidence",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "item_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("knowledge_items.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("verdict", sa.String(), nullable=False),
        sa.Column("tier", sa.String(), nullable=False, server_default="A"),
        sa.Column(
            "independent", sa.Boolean(), nullable=False, server_default="true"
        ),
        sa.Column(
            "hint_used", sa.Boolean(), nullable=False, server_default="false"
        ),
        sa.Column("reasoning", sa.Text(), nullable=True),
        sa.Column("response_ref", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "verdict in ('correct', 'incorrect', 'no_verdict')",
            name="ck_knowledge_evidence_verdict",
        ),
        sa.CheckConstraint(
            "tier in ('A', 'B', 'C')", name="ck_knowledge_evidence_tier"
        ),
    )
    op.create_index(
        "ix_knowledge_evidence_project_user_created",
        "knowledge_evidence",
        ["project_id", "user_id", "created_at"],
    )
    op.create_index("ix_knowledge_evidence_item", "knowledge_evidence", ["item_id"])


def downgrade() -> None:
    op.drop_index("ix_knowledge_evidence_item", table_name="knowledge_evidence")
    op.drop_index(
        "ix_knowledge_evidence_project_user_created", table_name="knowledge_evidence"
    )
    op.drop_table("knowledge_evidence")

    op.drop_index("ix_knowledge_edges_to_item", table_name="knowledge_edges")
    op.drop_index("ix_knowledge_edges_project", table_name="knowledge_edges")
    op.drop_table("knowledge_edges")

    op.drop_index("ix_knowledge_items_project_status", table_name="knowledge_items")
    op.drop_table("knowledge_items")
