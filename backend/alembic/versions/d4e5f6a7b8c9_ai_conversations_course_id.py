"""ai_conversations.course_id (course companion home)

Revision ID: d4e5f6a7b8c9
Revises: b4e1c7a2d9f0
Create Date: 2026-06-21 07:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'b4e1c7a2d9f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Course companion home (拍板 2026-06-21): a companion conversation belongs
    # to one course; CASCADE on course delete (unlike project_id's SET NULL).
    # Nullable + default NULL keeps the migration forward-compatible.
    op.add_column(
        'ai_conversations', sa.Column('course_id', sa.UUID(), nullable=True)
    )
    op.create_foreign_key(
        'fk_ai_conversations_course_id_courses',
        'ai_conversations',
        'courses',
        ['course_id'],
        ['id'],
        ondelete='CASCADE',
    )
    op.create_index(
        'ix_ai_conversations_course_id_updated_at',
        'ai_conversations',
        ['course_id', 'updated_at'],
        unique=False,
    )
    op.create_check_constraint(
        'ck_ai_conversations_single_home',
        'ai_conversations',
        'project_id IS NULL OR course_id IS NULL',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        'ck_ai_conversations_single_home', 'ai_conversations', type_='check'
    )
    op.drop_index(
        'ix_ai_conversations_course_id_updated_at',
        table_name='ai_conversations',
    )
    op.drop_constraint(
        'fk_ai_conversations_course_id_courses',
        'ai_conversations',
        type_='foreignkey',
    )
    op.drop_column('ai_conversations', 'course_id')
