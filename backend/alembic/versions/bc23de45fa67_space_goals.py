"""space_goals: 一个学习空间的目标周期（方向）

一张表，一个用途：让空间第一次有"为什么存在"。设计理由写在 `models/space_goal.py`
的开头（属于空间不属于人 · 文本不是数字 · `purpose` 承重 · 没有 achieved/failed）。

Additive：一张新表，不改任何既有行，也不回填 —— 旧空间一行目标都没有，
所以 `Snapshot.goal` 继续是 None，行为与迁移前一致。

Revision ID: bc23de45fa67
Revises: ab12cd34ef56
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "bc23de45fa67"
down_revision: Union[str, Sequence[str], None] = "ab12cd34ef56"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "space_goals",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_text", sa.Text(), nullable=False),
        sa.Column(
            "deadline_at", postgresql.TIMESTAMP(timezone=True), nullable=True
        ),
        sa.Column("context", sa.Text(), nullable=True),
        sa.Column("purpose", sa.String(), nullable=False),
        sa.Column("origin", sa.String(), nullable=False),
        sa.Column("status", sa.String(), server_default="draft", nullable=False),
        sa.Column(
            "confirmed_at", postgresql.TIMESTAMP(timezone=True), nullable=True
        ),
        sa.Column("closed_reason", sa.String(), nullable=True),
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
        sa.CheckConstraint(
            "status in ('draft', 'active', 'paused', 'closed')",
            name="ck_space_goals_status",
        ),
        sa.CheckConstraint(
            "purpose in ('exam_performance', 'understanding', 'build_something', 'other')",
            name="ck_space_goals_purpose",
        ),
        sa.CheckConstraint(
            "origin in ('user_stated', 'user_entered', 'agent_proposed')",
            name="ck_space_goals_origin",
        ),
        sa.CheckConstraint(
            "closed_reason in ('system_no_further_value', 'user_achieved', "
            "'user_abandoned', 'user_superseded')",
            name="ck_space_goals_closed_reason_value",
        ),
        sa.CheckConstraint(
            "length(btrim(target_text)) > 0",
            name="ck_space_goals_target_text_not_blank",
        ),
        # 「关闭」必须带理由：一个没有理由的停止，正是这套设计要避免的那个状态。
        sa.CheckConstraint(
            "(status = 'closed') = (closed_reason is not null)",
            name="ck_space_goals_close_reason_present",
        ),
        # CASCADE 两边：目标离开它的空间或它的主人都没有意义。
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name="space_goals_project_id_fkey",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["profiles.id"],
            name="space_goals_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="space_goals_pkey"),
    )
    op.create_index(
        "ix_space_goals_project_status", "space_goals", ["project_id", "status"]
    )
    op.create_index(
        "ix_space_goals_user_created", "space_goals", ["user_id", "created_at"]
    )
    # 一个空间至多一个 active。draft / paused / closed 不受约束 —— 一个空间一辈子
    # 可以堆下若干个已结束的目标周期，这正是"关掉这个、开下一个"零成本的原因。
    op.create_index(
        "uq_space_goals_active_per_project",
        "space_goals",
        ["project_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )


def downgrade() -> None:
    op.drop_index("uq_space_goals_active_per_project", table_name="space_goals")
    op.drop_index("ix_space_goals_user_created", table_name="space_goals")
    op.drop_index("ix_space_goals_project_status", table_name="space_goals")
    op.drop_table("space_goals")
