"""add payments tables and profile credits_balance

从 main-v2 移植支付系统时重建的修订（内容与 main-v2 的 b3c5d7e9f1a2 等价）。

为什么不直接照搬 b3c5d7e9f1a2：那个修订挂在 `8cb12750614d` 上，那是两条链
的共同祖先；本链从 `8cb12750614d` 往下走的是 c3f1a9b2d5e7 那一路，终点是
`e6f1a3c8b2d7`。照搬会让本链长出第二个 head，故这里把同一份变更重新挂到
本链当前 head 上。

前端与后端对象（payments / payment_webhook_events / credit_ledger 三张表，
以及 profiles.credits_balance 这一列）在 2026-09-18 被
`e6f1a3c8b2d7_drop_main_v2_leftovers` 从共享开发库里清掉过——那条迁移的
docstring 说明过，那是「修库」而非 schema 演进。所以本修订在开发库上是
「重新创建」，在全新数据库上则是正常的首次创建，两种情况都成立。

注意：本修订只建结构，不动任何既有数据；profiles.credits_balance 带
server_default="0"，对已存在的行也是安全的。

Revision ID: f1a9c4e7d2b8
Revises: e6f1a3c8b2d7
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "f1a9c4e7d2b8"
down_revision: Union[str, Sequence[str], None] = "e6f1a3c8b2d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "profiles",
        sa.Column("credits_balance", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "payments",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("auth.users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("pack_id", sa.String(), nullable=False),
        sa.Column("credits", sa.Integer(), nullable=False),
        sa.Column("amount_usd", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        # Multi-channel from day one: (provider, provider_order_id) identifies
        # one order. PayPal is the only live channel for now.
        sa.Column("provider", sa.String(), nullable=False, server_default="paypal"),
        sa.Column("provider_order_id", sa.String(), nullable=False),
        sa.Column("paypal_payer_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="created"),
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
        sa.Column(
            "captured_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.UniqueConstraint(
            "provider", "provider_order_id", name="uq_payments_provider_order"
        ),
        sa.CheckConstraint(
            "status in ('created', 'approved', 'captured', 'failed', 'refunded')",
            name="ck_payments_status",
        ),
    )

    op.create_table(
        "payment_webhook_events",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("provider", sa.String(), nullable=False, server_default="paypal"),
        sa.Column("provider_event_id", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("resource_order_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="received"),
        sa.Column("detail", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "processed_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.UniqueConstraint(
            "provider_event_id", name="uq_payment_webhook_events_provider_event_id"
        ),
    )

    op.create_table(
        "credit_ledger",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("auth.users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("delta", sa.Integer(), nullable=False),
        sa.Column("balance_after", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(), nullable=False),
        sa.Column(
            "payment_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("payments.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_credit_ledger_user_id", "credit_ledger", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_credit_ledger_user_id")
    op.drop_table("credit_ledger")
    op.drop_table("payment_webhook_events")
    op.drop_table("payments")
    op.drop_column("profiles", "credits_balance")
