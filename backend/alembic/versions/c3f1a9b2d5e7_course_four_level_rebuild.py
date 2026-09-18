"""course domain rebuilt as course -> module -> lesson -> point

Revision ID: c3f1a9b2d5e7
Revises: 8cb12750614d
Create Date: 2026-09-18 08:20:00.000000

Destructive by design (开发期一次性豁免 rules 第七章「向前兼容」): the course
tree gains a level and every delivery table is re-keyed from chapter_id to
point_id, so the old tables are dropped and the new ones created rather than
migrated. Run scripts/wipe_course_domain.py --apply FIRST — it deletes the
Supabase Storage objects, which no SQL cascade can reach.

Also drops chapter_overviews outright: the AI-written chapter overview is
retired with this structure change.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c3f1a9b2d5e7'
down_revision: Union[str, Sequence[str], None] = '8cb12750614d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_OLD_COURSE_STATUS = (
    "status in ('intake', 'outline_ready', 'organizing', 'building', "
    "'materializing', 'ready', 'failed')"
)
# outline_ready / building belonged to the retired outline-then-research flow
# and no code writes them any more.
_NEW_COURSE_STATUS = (
    "status in ('intake', 'organizing', 'materializing', 'ready', 'failed')"
)


def upgrade() -> None:
    """Upgrade schema."""
    # --- drop the old tree + its delivery tables (FK-dependency order) ---
    op.drop_table('chapter_overviews')
    op.drop_table('chapter_gemini_files')
    op.drop_table('chapter_video_assets')
    op.drop_table('chapter_video_candidates')
    op.drop_table('course_chapters')
    op.drop_table('course_units')

    # --- courses: blurb + cover, and a narrower lifecycle ---
    op.add_column('courses', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('courses', sa.Column('cover_url', sa.String(), nullable=True))
    # A CHECK constraint can't be altered in place; drop + re-add.
    op.drop_constraint('ck_courses_status', 'courses', type_='check')
    op.create_check_constraint('ck_courses_status', 'courses', _NEW_COURSE_STATUS)

    # --- the new tree: module -> lesson -> point ---
    op.create_table(
        'course_modules',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column(
            'created_at',
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'ix_course_modules_course_id_order_index',
        'course_modules',
        ['course_id', 'order_index'],
    )

    op.create_table(
        'course_lessons',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('module_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column(
            'created_at',
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['module_id'], ['course_modules.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'ix_course_lessons_module_id_order_index',
        'course_lessons',
        ['module_id', 'order_index'],
    )

    op.create_table(
        'course_points',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('lesson_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('build_status', sa.String(), nullable=False),
        sa.Column(
            'chosen_candidate_id', postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.Column(
            'created_at',
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.CheckConstraint(
            "build_status in ('not_started', 'researching', 'ready', 'failed')",
            name='ck_course_points_build_status',
        ),
        sa.ForeignKeyConstraint(
            ['lesson_id'], ['course_lessons.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'ix_course_points_lesson_id_order_index',
        'course_points',
        ['lesson_id', 'order_index'],
    )

    # --- delivery tables, re-keyed to point_id ---
    op.create_table(
        'point_video_candidates',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('point_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('platform', sa.String(), nullable=False),
        sa.Column('platform_video_id', sa.String(), nullable=False),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('author', sa.String(), nullable=True),
        sa.Column('author_id', sa.String(), nullable=True),
        sa.Column('duration_s', sa.Integer(), nullable=True),
        # BigInteger (was Integer on the old chapter table): matches the search
        # pool, so a popular video no longer needs clamping on the way in.
        sa.Column('view_count', sa.BigInteger(), nullable=True),
        sa.Column('like_count', sa.BigInteger(), nullable=True),
        sa.Column('thumbnail_url', sa.String(), nullable=True),
        sa.Column('score', sa.Numeric(), nullable=True),
        sa.Column(
            'is_chosen', sa.Boolean(), server_default='false', nullable=False
        ),
        sa.Column('discovery_source', sa.String(), nullable=False),
        sa.Column('raw_json', postgresql.JSONB(), nullable=False),
        sa.Column(
            'created_at',
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['point_id'], ['course_points.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'ix_point_video_candidates_point_id', 'point_video_candidates', ['point_id']
    )

    op.create_table(
        'point_video_assets',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('point_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('candidate_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('storage_bucket', sa.String(), nullable=True),
        sa.Column('storage_path', sa.String(), nullable=True),
        sa.Column('download_backend', sa.String(), nullable=True),
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('duration_s', sa.Integer(), nullable=True),
        sa.Column('error_type', sa.String(), nullable=True),
        sa.Column(
            'downloaded_at', postgresql.TIMESTAMP(timezone=True), nullable=True
        ),
        sa.Column(
            'last_accessed_at', postgresql.TIMESTAMP(timezone=True), nullable=True
        ),
        sa.Column('expires_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
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
            "status in ('pending', 'downloading', 'ready', 'failed')",
            name='ck_point_video_assets_status',
        ),
        sa.ForeignKeyConstraint(
            ['candidate_id'], ['point_video_candidates.id'], ondelete='CASCADE'
        ),
        sa.ForeignKeyConstraint(
            ['point_id'], ['course_points.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('point_id'),
    )
    op.create_index(
        'ix_point_video_assets_last_accessed_at',
        'point_video_assets',
        ['last_accessed_at'],
    )

    op.create_table(
        'point_gemini_files',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('point_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('candidate_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('file_id', sa.String(), nullable=True),
        sa.Column('file_uri', sa.String(), nullable=True),
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('expires_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('error_type', sa.String(), nullable=True),
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
            "status in ('pending', 'uploading', 'ready', 'failed')",
            name='ck_point_gemini_files_status',
        ),
        sa.ForeignKeyConstraint(
            ['candidate_id'], ['point_video_candidates.id'], ondelete='CASCADE'
        ),
        sa.ForeignKeyConstraint(
            ['point_id'], ['course_points.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('point_id'),
    )


def downgrade() -> None:
    """Downgrade schema.

    Restores the three-level tables as they were. Course CONTENT does not come
    back (this revision drops it); downgrade exists so the schema can be rolled
    to the previous shape, not to recover data.
    """
    op.drop_table('point_gemini_files')
    op.drop_index(
        'ix_point_video_assets_last_accessed_at', table_name='point_video_assets'
    )
    op.drop_table('point_video_assets')
    op.drop_index(
        'ix_point_video_candidates_point_id', table_name='point_video_candidates'
    )
    op.drop_table('point_video_candidates')
    op.drop_index(
        'ix_course_points_lesson_id_order_index', table_name='course_points'
    )
    op.drop_table('course_points')
    op.drop_index(
        'ix_course_lessons_module_id_order_index', table_name='course_lessons'
    )
    op.drop_table('course_lessons')
    op.drop_index(
        'ix_course_modules_course_id_order_index', table_name='course_modules'
    )
    op.drop_table('course_modules')

    op.drop_constraint('ck_courses_status', 'courses', type_='check')
    op.create_check_constraint('ck_courses_status', 'courses', _OLD_COURSE_STATUS)
    op.drop_column('courses', 'cover_url')
    op.drop_column('courses', 'description')

    op.create_table(
        'course_units',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('overview', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column(
            'created_at',
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'ix_course_units_course_id_order_index',
        'course_units',
        ['course_id', 'order_index'],
    )

    op.create_table(
        'course_chapters',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('unit_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('progress', sa.Integer(), server_default='0', nullable=False),
        sa.Column(
            'chosen_candidate_id', postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.Column(
            'created_at',
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status in ('not_started', 'researching', 'ready', 'failed')",
            name='ck_course_chapters_status',
        ),
        sa.ForeignKeyConstraint(
            ['unit_id'], ['course_units.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'ix_course_chapters_unit_id_order_index',
        'course_chapters',
        ['unit_id', 'order_index'],
    )

    op.create_table(
        'chapter_video_candidates',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chapter_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('platform', sa.String(), nullable=False),
        sa.Column('platform_video_id', sa.String(), nullable=False),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('author', sa.String(), nullable=True),
        sa.Column('author_id', sa.String(), nullable=True),
        sa.Column('duration_s', sa.Integer(), nullable=True),
        sa.Column('view_count', sa.Integer(), nullable=True),
        sa.Column('like_count', sa.Integer(), nullable=True),
        sa.Column('thumbnail_url', sa.String(), nullable=True),
        sa.Column('score', sa.Numeric(), nullable=True),
        sa.Column(
            'is_chosen', sa.Boolean(), server_default='false', nullable=False
        ),
        sa.Column('discovery_source', sa.String(), nullable=False),
        sa.Column('raw_json', postgresql.JSONB(), nullable=False),
        sa.Column(
            'created_at',
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['chapter_id'], ['course_chapters.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'ix_chapter_video_candidates_chapter_id',
        'chapter_video_candidates',
        ['chapter_id'],
    )

    op.create_table(
        'chapter_video_assets',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chapter_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('candidate_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('storage_bucket', sa.String(), nullable=True),
        sa.Column('storage_path', sa.String(), nullable=True),
        sa.Column('download_backend', sa.String(), nullable=True),
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('duration_s', sa.Integer(), nullable=True),
        sa.Column('error_type', sa.String(), nullable=True),
        sa.Column(
            'downloaded_at', postgresql.TIMESTAMP(timezone=True), nullable=True
        ),
        sa.Column(
            'last_accessed_at', postgresql.TIMESTAMP(timezone=True), nullable=True
        ),
        sa.Column('expires_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
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
            "status in ('pending', 'downloading', 'ready', 'failed')",
            name='ck_chapter_video_assets_status',
        ),
        sa.ForeignKeyConstraint(
            ['candidate_id'], ['chapter_video_candidates.id'], ondelete='CASCADE'
        ),
        sa.ForeignKeyConstraint(
            ['chapter_id'], ['course_chapters.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('chapter_id'),
    )
    op.create_index(
        'ix_chapter_video_assets_last_accessed_at',
        'chapter_video_assets',
        ['last_accessed_at'],
    )

    op.create_table(
        'chapter_gemini_files',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chapter_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('candidate_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('file_id', sa.String(), nullable=True),
        sa.Column('file_uri', sa.String(), nullable=True),
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('expires_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('error_type', sa.String(), nullable=True),
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
            "status in ('pending', 'uploading', 'ready', 'failed')",
            name='ck_chapter_gemini_files_status',
        ),
        sa.ForeignKeyConstraint(
            ['candidate_id'], ['chapter_video_candidates.id'], ondelete='CASCADE'
        ),
        sa.ForeignKeyConstraint(
            ['chapter_id'], ['course_chapters.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('chapter_id'),
    )

    op.create_table(
        'chapter_overviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chapter_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('candidate_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('markdown', sa.Text(), nullable=True),
        sa.Column('error_type', sa.String(), nullable=True),
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
            "status in ('pending', 'generating', 'ready', 'failed')",
            name='ck_chapter_overviews_status',
        ),
        sa.ForeignKeyConstraint(
            ['candidate_id'], ['chapter_video_candidates.id'], ondelete='CASCADE'
        ),
        sa.ForeignKeyConstraint(
            ['chapter_id'], ['course_chapters.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('chapter_id'),
    )
