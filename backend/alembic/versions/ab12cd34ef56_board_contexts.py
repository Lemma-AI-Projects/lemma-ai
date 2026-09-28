"""board_context_bundles: Mala 的投送包（用户从画板上选中的材料）

一张表，一个用途：把"他在画板上选的这几样东西"存住，好让下一轮对话能引用它。

**不新增任何对画板的依赖** —— 这条链不读 `board_snapshots`，也不碰对象存储
（`items` 就是前端算好的语义投影，落在本地库里）。详见 `models/board_context.py` 的开头。

`items` 是 JSONB 快照而不是子表：它从不被单独查询，且必须冻结在投送那一刻。
Additive：一张新表，不改任何既有行。

Revision ID: ab12cd34ef56
Revises: c3d4e5f6a7b8
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "ab12cd34ef56"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "board_context_bundles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("label", sa.Text(), nullable=True),
        sa.Column(
            "source", sa.String(), server_default="selection", nullable=False
        ),
        sa.Column(
            "selection_mode", sa.String(), server_default="rectangle", nullable=False
        ),
        sa.Column("bounding_box", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("items", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "source in ('selection', 'cluster')",
            name="ck_board_context_bundles_source",
        ),
        sa.CheckConstraint(
            "selection_mode in ('rectangle', 'lasso')",
            name="ck_board_context_bundles_selection_mode",
        ),
        # CASCADE 两边：包离开它的空间或它的主人都没有意义。
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name="board_context_bundles_project_id_fkey",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["profiles.id"],
            name="board_context_bundles_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="board_context_bundles_pkey"),
    )
    op.create_index(
        "ix_board_context_bundles_project_created",
        "board_context_bundles",
        ["project_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_board_context_bundles_project_created",
        table_name="board_context_bundles",
    )
    op.drop_table("board_context_bundles")
