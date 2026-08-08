"""Payments multi-provider migration: add provider + provider_order_id.

- `payments.provider` (default 'paypal') + `payments.provider_order_id`
  (backfilled from the legacy `paypal_order_id`).
- Unique constraint moves from `paypal_order_id` to `(provider, provider_order_id)`.
- `paypal_order_id` becomes nullable (Stripe rows don't have one).
- `payment_webhook_events.provider` (default 'paypal').
"""

import sqlalchemy as sa
from alembic import op

revision = "7f3c9a1b5d2e"
# 2026-08-08 修正：此前误指向 root（0a9a68d3d7fd），导致多 head；改为指向
# learn-space 链头（3a5b7c9d1e2f），由 merge 迁移统一汇入主线。
down_revision = "3a5b7c9d1e2f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "payments",
        sa.Column("provider", sa.String(), nullable=False, server_default="paypal"),
    )
    op.add_column(
        "payments",
        sa.Column("provider_order_id", sa.String(), nullable=True),
    )
    op.execute(
        "UPDATE payments SET provider_order_id = paypal_order_id "
        "WHERE provider_order_id IS NULL"
    )
    op.alter_column("payments", "provider_order_id", nullable=False)
    op.alter_column("payments", "paypal_order_id", nullable=True)
    op.drop_constraint("uq_payments_paypal_order_id", "payments", type_="unique")
    op.create_unique_constraint(
        "uq_payments_provider_order", "payments", ["provider", "provider_order_id"]
    )
    op.add_column(
        "payment_webhook_events",
        sa.Column("provider", sa.String(), nullable=False, server_default="paypal"),
    )


def downgrade() -> None:
    op.drop_constraint("uq_payments_provider_order", "payments", type_="unique")
    op.create_unique_constraint(
        "uq_payments_paypal_order_id", "payments", ["paypal_order_id"]
    )
    op.alter_column("payments", "paypal_order_id", nullable=False)
    op.alter_column("payments", "provider_order_id", nullable=True)
    op.drop_column("payments", "provider_order_id")
    op.drop_column("payments", "provider")
    op.drop_column("payment_webhook_events", "provider")
