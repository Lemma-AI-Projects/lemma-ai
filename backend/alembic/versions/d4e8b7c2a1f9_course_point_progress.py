"""course_point_progress: learner progress per learning point

Purely additive: one new table, no existing table touched. Learning progress had
no storage at all before this (course.status / point.build_status are generation
pipeline state), so there is nothing to backfill — every learner starts at zero.

Revision ID: d4e8b7c2a1f9
Revises: c3f1a9b2d5e7
Create Date: 2026-09-18 19:04:11.882014

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd4e8b7c2a1f9'
down_revision: Union[str, Sequence[str], None] = 'c3f1a9b2d5e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'course_point_progress',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('point_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            'last_position_seconds',
            sa.Integer(),
            server_default='0',
            nullable=False,
        ),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column(
            'completed_at',
            postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.Column(
            'created_at',
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.CheckConstraint(
            'last_position_seconds >= 0',
            name='ck_course_point_progress_last_position_seconds',
        ),
        sa.CheckConstraint(
            'duration_seconds is null or duration_seconds > 0',
            name='ck_course_point_progress_duration_seconds',
        ),
        sa.ForeignKeyConstraint(
            ['user_id'], ['profiles.id'], ondelete='CASCADE'
        ),
        sa.ForeignKeyConstraint(
            ['point_id'], ['course_points.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'user_id',
            'point_id',
            name='uq_course_point_progress_user_id_point_id',
        ),
    )
    op.create_index(
        'ix_course_point_progress_user_id_completed_at',
        'course_point_progress',
        ['user_id', 'completed_at'],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        'ix_course_point_progress_user_id_completed_at',
        table_name='course_point_progress',
    )
    op.drop_table('course_point_progress')
