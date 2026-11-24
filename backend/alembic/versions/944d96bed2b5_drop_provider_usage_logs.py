"""drop provider usage logs

provider_usage_logs was the spend ledger of the video-search layer. Its only
writer went away with the video course (47d50d008e80), and nothing reads it,
so the table is dropped together with its history (拍板 2026-11-24).

downgrade() restores the empty table only; the ledger rows are not
recoverable.

Revision ID: 944d96bed2b5
Revises: 47d50d008e80
Create Date: 2026-11-24 19:06:05.444780

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '944d96bed2b5'
down_revision: Union[str, Sequence[str], None] = '47d50d008e80'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_index('ix_provider_usage_logs_trace_id', table_name='provider_usage_logs')
    op.drop_table('provider_usage_logs')


def downgrade() -> None:
    """Downgrade schema: empty table only (see module docstring)."""
    op.create_table('provider_usage_logs',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('provider', sa.String(), nullable=False),
    sa.Column('actor_id', sa.String(), nullable=True),
    sa.Column('platform', sa.String(), nullable=False),
    sa.Column('use_case', sa.String(), nullable=False),
    sa.Column('run_id', sa.String(), nullable=True),
    sa.Column('result_count', sa.Integer(), nullable=True),
    sa.Column('cost_usd', sa.Numeric(precision=12, scale=8), nullable=True),
    sa.Column('latency_ms', sa.Integer(), nullable=False),
    sa.Column('success', sa.Boolean(), nullable=False),
    sa.Column('error_type', sa.String(), nullable=True),
    sa.Column('course_id', sa.UUID(), nullable=True),
    sa.Column('trace_id', sa.String(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_provider_usage_logs_trace_id', 'provider_usage_logs', ['trace_id'], unique=False)
