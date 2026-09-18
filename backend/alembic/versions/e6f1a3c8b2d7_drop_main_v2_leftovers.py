"""drop main-v2 leftovers from the shared database

开发库分叉清理。main-v2 与本链都从 8cb12750614d 往下接，两条链共用同一个开发
数据库，于是那边的支付/名册/日历/文档四套表和三个加在共享表上的列留在了库里，
而本链的 alembic_version 并不记得它们。结果是 `alembic check` 一直嚷着要删它们，
autogenerate 也就没法安全使用。

这不是 schema 演进，是修库：本链从未创建过这些对象，所以每一句都带 IF EXISTS，
在全新数据库（生产）上是彻底的 no-op，只有那个被两条链共用过的开发库会真的被清。

删除的内容（清理时全部为空表，payments 有 2 笔 status='created' 的未支付
PayPal 订单）：
  支付  payments / payment_webhook_events / credit_ledger + profiles.credits_balance
  名册  organizations / classes / enrollments / roster_integrations /
        roster_sync_runs / external_identities
  日历  calendar_connections / synced_events
  文档  pages / blocks
  课程  courses.mode / courses.tuning_json
main-v2 挂在旧三层结构上的 course_lesson_objects / course_lesson_observations /
course_chapters.objective / blueprint_json 不在此列——它们随 c3f1a9b2d5e7 的四层
重建已经消失了。

Revision ID: e6f1a3c8b2d7
Revises: d4e8b7c2a1f9
Create Date: 2026-09-18 19:31:08.447512

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'e6f1a3c8b2d7'
down_revision: Union[str, Sequence[str], None] = 'd4e8b7c2a1f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# 子表在前，但仍带 CASCADE：本链没有这些表的模型，不该假设自己清楚它们之间
# 的外键全貌。
_TABLES = (
    "synced_events",
    "calendar_connections",
    "blocks",
    "pages",
    "credit_ledger",
    "payment_webhook_events",
    "payments",
    "external_identities",
    "roster_sync_runs",
    "roster_integrations",
    "enrollments",
    "classes",
    "organizations",
)

_COLUMNS = (
    ("courses", "mode"),
    ("courses", "tuning_json"),
    ("profiles", "credits_balance"),
)


def upgrade() -> None:
    """Upgrade schema."""
    for table in _TABLES:
        op.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
    # 列上的 CHECK（ck_courses_mode）随列一起消失，无需单独处理。
    for table, column in _COLUMNS:
        op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS {column}")


def downgrade() -> None:
    """Downgrade schema.

    刻意留空。这些对象由 main-v2 的迁移链创建，本链从未拥有过它们的定义，在这里
    重建只会凭空捏造一份可能已经对不上的结构。要恢复就回 main-v2 跑它自己的链。
    """
