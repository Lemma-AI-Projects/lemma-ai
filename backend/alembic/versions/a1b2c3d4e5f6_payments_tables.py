"""add payments tables and profile credits_balance

Merges the two pre-existing heads (8cb12750614d, 3f1a2b3c4d5e) into one.

Revision ID: a1b2c3d4e5f6
Revises: 8cb12750614d, 3f1a2b3c4d5e
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = ("8cb12750614d", "3f1a2b3c4d5e")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "profiles",
        sa.Column("credits_balance", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "payments",
        sa.Column(
            "id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True
        ),
        sa.Column(
            "user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("auth.users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("pack_id", sa.String(), nullable=False),
        sa.Column("credits", sa.Integer(), nullable=False),
        sa.Column("amount_usd", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "currency", sa.String(3), nullable=False, server_default="USD"
        ),
        sa.Column("paypal_order_id", sa.String(), nullable=False),
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
        sa.UniqueConstraint("paypal_order_id", name="uq_payments_paypal_order_id"),
        sa.CheckConstraint(
            "status in ('created', 'approved', 'captured', 'failed', 'refunded')",
            name="ck_payments_status",
        ),
    )

    op.create_table(
        "payment_webhook_events",
        sa.Column(
            "id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True
        ),
        sa.Column("paypal_event_id", sa.String(), nullable=False),
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
            "paypal_event_id", name="uq_payment_webhook_events_paypal_event_id"
        ),
    )

    op.create_table(
        "credit_ledger",
        sa.Column(
            "id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True
        ),
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
