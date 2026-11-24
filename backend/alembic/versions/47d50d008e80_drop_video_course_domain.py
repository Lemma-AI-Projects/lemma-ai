"""drop video course domain

The video course (course -> module -> lesson -> point, one video per point)
is retired. This removes its nine tables and the ai_conversations.course_id
companion link.

Run order matters, and this migration enforces the part it can see:
1. scripts/wipe_course_domain.py --apply FIRST. It deletes the re-hosted
   videos in Supabase Storage, which no SQL cascade can reach; once the
   point_video_assets rows are gone their object keys are lost for good. The
   guard below refuses to run while any asset row still records an object.
2. Deploy the code that no longer reads or writes course_id, THEN run this.

Data steps (拍板):
- companion conversations (course_id set) are deleted, with their messages
  and the Desmos graphs drawn in them (both FK CASCADE);
- course_planning card references are cleared from ai_messages.tool_json;
  the intro message itself stays.

downgrade() restores the table structure only. Deleted rows, conversations
and Storage objects are not recoverable.

Revision ID: 47d50d008e80
Revises: b3da7b4eccfe
Create Date: 2026-11-24 18:45:02.371507

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '47d50d008e80'
down_revision: Union[str, Sequence[str], None] = 'b3da7b4eccfe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# A DO block rather than a Python-side query so the guard also holds in
# offline (--sql) mode.
_STORAGE_GUARD_SQL = """
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM point_video_assets WHERE storage_path IS NOT NULL
    ) THEN
        RAISE EXCEPTION
            'point_video_assets still records Storage objects; run '
            'scripts/wipe_course_domain.py --apply before this migration';
    END IF;
END
$$;
"""


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(_STORAGE_GUARD_SQL)

    op.execute("DELETE FROM ai_conversations WHERE course_id IS NOT NULL")
    op.execute(
        "UPDATE ai_messages SET tool_json = NULL "
        "WHERE tool_json ->> 'type' = 'course_planning'"
    )

    op.drop_constraint(
        'ck_ai_conversations_single_home', 'ai_conversations', type_='check'
    )
    op.drop_index(
        'ix_ai_conversations_course_id_updated_at', table_name='ai_conversations'
    )
    op.drop_constraint(
        'fk_ai_conversations_course_id_courses',
        'ai_conversations',
        type_='foreignkey',
    )
    op.drop_column('ai_conversations', 'course_id')

    # Children before parents (FK order).
    op.drop_table('point_gemini_files')
    op.drop_table('point_video_assets')
    op.drop_table('point_video_candidates')
    op.drop_table('course_point_progress')
    op.drop_table('course_points')
    op.drop_table('course_lessons')
    op.drop_table('course_modules')
    op.drop_table('course_search_candidates')
    op.drop_table('courses')


def downgrade() -> None:
    """Downgrade schema: empty tables only (see module docstring)."""
    op.create_table('courses',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('conversation_id', sa.UUID(), nullable=True),
    sa.Column('topic', sa.String(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('cover_url', sa.String(), nullable=True),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('search_status', sa.String(), server_default='searching', nullable=False),
    sa.Column('intake_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("status in ('intake', 'organizing', 'materializing', 'ready', 'failed')", name='ck_courses_status'),
    sa.CheckConstraint("search_status in ('searching', 'searched', 'failed')", name='ck_courses_search_status'),
    sa.ForeignKeyConstraint(['conversation_id'], ['ai_conversations.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['profiles.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_courses_user_id_updated_at', 'courses', ['user_id', 'updated_at'], unique=False)

    op.create_table('course_search_candidates',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('course_id', sa.UUID(), nullable=False),
    sa.Column('platform', sa.String(), nullable=False),
    sa.Column('platform_video_id', sa.String(), nullable=False),
    sa.Column('url', sa.String(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('author', sa.String(), nullable=True),
    sa.Column('author_id', sa.String(), nullable=True),
    sa.Column('duration_s', sa.Integer(), nullable=True),
    sa.Column('view_count', sa.BigInteger(), nullable=True),
    sa.Column('like_count', sa.BigInteger(), nullable=True),
    sa.Column('comment_count', sa.BigInteger(), nullable=True),
    sa.Column('published_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
    sa.Column('thumbnail_url', sa.String(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('metrics', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('raw_json', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_course_search_candidates_course_id', 'course_search_candidates', ['course_id'], unique=False)

    op.create_table('course_modules',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('course_id', sa.UUID(), nullable=False),
    sa.Column('order_index', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('summary', sa.Text(), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_course_modules_course_id_order_index', 'course_modules', ['course_id', 'order_index'], unique=False)

    op.create_table('course_lessons',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('module_id', sa.UUID(), nullable=False),
    sa.Column('order_index', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('summary', sa.Text(), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['module_id'], ['course_modules.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_course_lessons_module_id_order_index', 'course_lessons', ['module_id', 'order_index'], unique=False)

    op.create_table('course_points',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('lesson_id', sa.UUID(), nullable=False),
    sa.Column('order_index', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('build_status', sa.String(), nullable=False),
    sa.Column('chosen_candidate_id', sa.UUID(), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("build_status in ('not_started', 'researching', 'ready', 'failed')", name='ck_course_points_build_status'),
    sa.ForeignKeyConstraint(['lesson_id'], ['course_lessons.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_course_points_lesson_id_order_index', 'course_points', ['lesson_id', 'order_index'], unique=False)

    op.create_table('course_point_progress',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('point_id', sa.UUID(), nullable=False),
    sa.Column('last_position_seconds', sa.Integer(), server_default='0', nullable=False),
    sa.Column('duration_seconds', sa.Integer(), nullable=True),
    sa.Column('completed_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('last_position_seconds >= 0', name='ck_course_point_progress_last_position_seconds'),
    sa.CheckConstraint('duration_seconds is null or duration_seconds > 0', name='ck_course_point_progress_duration_seconds'),
    sa.ForeignKeyConstraint(['point_id'], ['course_points.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['profiles.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'point_id', name='uq_course_point_progress_user_id_point_id')
    )
    op.create_index('ix_course_point_progress_user_id_completed_at', 'course_point_progress', ['user_id', 'completed_at'], unique=False)

    op.create_table('point_video_candidates',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('point_id', sa.UUID(), nullable=False),
    sa.Column('platform', sa.String(), nullable=False),
    sa.Column('platform_video_id', sa.String(), nullable=False),
    sa.Column('url', sa.String(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('author', sa.String(), nullable=True),
    sa.Column('author_id', sa.String(), nullable=True),
    sa.Column('duration_s', sa.Integer(), nullable=True),
    sa.Column('view_count', sa.BigInteger(), nullable=True),
    sa.Column('like_count', sa.BigInteger(), nullable=True),
    sa.Column('thumbnail_url', sa.String(), nullable=True),
    sa.Column('score', sa.Numeric(), nullable=True),
    sa.Column('is_chosen', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('discovery_source', sa.String(), nullable=False),
    sa.Column('raw_json', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['point_id'], ['course_points.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_point_video_candidates_point_id', 'point_video_candidates', ['point_id'], unique=False)

    op.create_table('point_video_assets',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('point_id', sa.UUID(), nullable=False),
    sa.Column('candidate_id', sa.UUID(), nullable=True),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('storage_bucket', sa.String(), nullable=True),
    sa.Column('storage_path', sa.String(), nullable=True),
    sa.Column('download_backend', sa.String(), nullable=True),
    sa.Column('mime_type', sa.String(), nullable=True),
    sa.Column('size_bytes', sa.BigInteger(), nullable=True),
    sa.Column('duration_s', sa.Integer(), nullable=True),
    sa.Column('error_type', sa.String(), nullable=True),
    sa.Column('downloaded_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
    sa.Column('last_accessed_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
    sa.Column('expires_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("status in ('pending', 'downloading', 'ready', 'failed')", name='ck_point_video_assets_status'),
    sa.ForeignKeyConstraint(['candidate_id'], ['point_video_candidates.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['point_id'], ['course_points.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('point_id')
    )
    op.create_index('ix_point_video_assets_last_accessed_at', 'point_video_assets', ['last_accessed_at'], unique=False)

    op.create_table('point_gemini_files',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('point_id', sa.UUID(), nullable=False),
    sa.Column('candidate_id', sa.UUID(), nullable=True),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('file_id', sa.String(), nullable=True),
    sa.Column('file_uri', sa.String(), nullable=True),
    sa.Column('mime_type', sa.String(), nullable=True),
    sa.Column('expires_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
    sa.Column('error_type', sa.String(), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("status in ('pending', 'uploading', 'ready', 'failed')", name='ck_point_gemini_files_status'),
    sa.ForeignKeyConstraint(['candidate_id'], ['point_video_candidates.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['point_id'], ['course_points.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('point_id')
    )

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
