"""method_episodes: 一段承诺（一个做法 + 一段交互）及其结局

R1–R3 让做法能声明四要素、让协调层能挑做法，但"一段"仍然没有对象：
`ai_conversations.method` 是一个挂在**线程**上的字符串，而承诺的单位是**一段交互**。
五个出口里三个无处可记 —— 暂停无记录、转换只改一个字符串、重新诊断无处落。

这张表就是那个单位。设计理由在 `models/method_episode.py` 的开头，五条关键决定：
属于空间不属人 · `method` **无外键**（做法可被卸载，事实要留得住）·
**不存开始时间用于计时**（判据只依赖证据）· 判据与人话**一起存**（分开必然漂）·
不存 learner state 副本。

部分唯一索引 `uq_method_episodes_active_per_project` 是这条纪律的执行者：
**一个空间至多一段在进行**，由数据库兜住 —— 这是关于世界的一个事实，
不是一个该被 service 吞掉的错误。

Additive：新表，不改既有行、不回填。R4b 尚无调用方，所以行为零变化。

Revision ID: f1c2d3e4a5b6
Revises: d4e9f7a1b2c3
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f1c2d3e4a5b6"
down_revision: Union[str, Sequence[str], None] = "d4e9f7a1b2c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "method_episodes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("method", sa.String(), nullable=False),
        sa.Column("goal_purpose", sa.String(), nullable=True),
        sa.Column("focus_label", sa.Text(), nullable=True),
        sa.Column("commitment", sa.Text(), nullable=False),
        sa.Column(
            "evidence_target",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
        sa.Column(
            "completion_rule",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
        sa.Column("status", sa.String(), server_default="active", nullable=False),
        sa.Column("exit_reason", sa.Text(), nullable=True),
        sa.Column(
            "opened_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("closed_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["project_id"], ["projects.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"], ondelete="CASCADE"),
        # SET NULL, not CASCADE: deleting the conversation must not erase the
        # fact that we made a promise in it.
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["ai_conversations.id"], ondelete="SET NULL"
        ),
        sa.CheckConstraint(
            "status in ('achieved', 'not_achieved', 'paused', 'switched', "
            "'rediagnosed', 'active')",
            name="ck_method_episodes_status",
        ),
        # A silent change and a random change look identical afterwards.
        sa.CheckConstraint(
            "(status not in ('switched', 'rediagnosed')) "
            "or (exit_reason is not null and length(btrim(exit_reason)) > 0)",
            name="ck_method_episodes_exit_reason",
        ),
    )
    op.create_index(
        "ix_method_episodes_project_status",
        "method_episodes",
        ["project_id", "status"],
    )
    op.create_index(
        "ix_method_episodes_conversation",
        "method_episodes",
        ["conversation_id", "opened_at"],
    )
    # At most one ACTIVE episode per space, enforced by the database rather
    # than by a service check — two running episodes are a fact about the world
    # that must not exist, not an error to swallow.
    op.create_index(
        "uq_method_episodes_active_per_project",
        "method_episodes",
        ["project_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_method_episodes_active_per_project",
        table_name="method_episodes",
        postgresql_where=sa.text("status = 'active'"),
    )
    op.drop_index("ix_method_episodes_conversation", table_name="method_episodes")
    op.drop_index("ix_method_episodes_project_status", table_name="method_episodes")
    op.drop_table("method_episodes")
