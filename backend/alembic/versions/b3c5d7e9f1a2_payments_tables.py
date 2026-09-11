"""add payments tables and profile credits_balance

Single-head revision: chained onto this branch's head (8cb12750614d). On main
the same change was a merge revision because that branch had a second head
(dev dashboard); here there is only one, so no merge is needed.

Revision ID: b3c5d7e9f1a2
Revises: 8cb12750614d
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "b3c5d7e9f1a2"
down_revision: Union[str, Sequence[str], None] = "8cb12750614d"
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
