"""learn space: bind companion agent persona to projects

Revision ID: 9e2c4f6a8b1d
Revises: 0a9a68d3d7fd
Create Date: 2026-08-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "9e2c4f6a8b1d"
down_revision: str | None = "0a9a68d3d7fd"
branch_labels: str | Sequence[str] | None = None
# 历史链缺陷修复（2026-08-15 真 PG 验证发现）：本迁移 ALTER projects，
# 但 projects 由 d9866525028c（支 B 深处）创建——两迁移从根并行、无顺序约束，
# 兄弟支乱序执行导致「ALTER 先于 CREATE」→ relation projects does not exist。
# depends_on 强制 CREATE 先于本迁移（不改 down_revision 拓扑，alembic 官方机制）。
depends_on: str | Sequence[str] | None = "d9866525028c"


def upgrade() -> None:
    op.add_column("projects", sa.Column("agent_name", sa.String(), nullable=True))
    op.add_column("projects", sa.Column("agent_personality", sa.Text(), nullable=True))
    op.add_column("projects", sa.Column("agent_teaching_style", sa.Text(), nullable=True))
    op.add_column("projects", sa.Column("agent_welcome", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "agent_welcome")
    op.drop_column("projects", "agent_teaching_style")
    op.drop_column("projects", "agent_personality")
    op.drop_column("projects", "agent_name")
