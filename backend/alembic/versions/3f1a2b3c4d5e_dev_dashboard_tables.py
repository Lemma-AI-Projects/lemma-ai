"""dev_messages + dev_audit_logs for the /admindev dashboard

Revision ID: 3f1a2b3c4d5e
Revises: 0a9a68d3d7fd
Create Date: 2026-08-05 09:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '3f1a2b3c4d5e'
down_revision: Union[str, Sequence[str], None] = '0a9a68d3d7fd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'dev_messages',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('author', sa.String(length=64), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_dev_messages_created_at', 'dev_messages', ['created_at'])
    op.create_table(
        'dev_audit_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('actor', sa.String(length=64), nullable=False),
        sa.Column('action', sa.String(length=128), nullable=False),
        sa.Column('detail', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_dev_audit_logs_created_at', 'dev_audit_logs', ['created_at'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_dev_audit_logs_created_at', table_name='dev_audit_logs')
    op.drop_table('dev_audit_logs')
    op.drop_index('ix_dev_messages_created_at', table_name='dev_messages')
    op.drop_table('dev_messages')
