"""create plugins (static catalog) and user_plugins (install state) tables

Revision ID: d3e5f7a9b1c3
Revises: c4e6a8b0d2f4
Create Date: 2026-08-15

插件市场真实化（P2）：
- plugins = 产品内置静态目录（35 个学科能力包，种子数据）
- user_plugins = 用户安装态（RLS 按 auth.uid() 隔离）
- installed_default：新用户懒初始化播种（general 工具 + math-solver 默认可用）
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd3e5f7a9b1c3'
down_revision: Union[str, Sequence[str], None] = 'c4e6a8b0d2f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ── plugins 静态目录 ───────────────────────────────────────────────
    op.create_table(
        'plugins',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('subject', sa.String(), nullable=False),
        sa.Column('icon_name', sa.String(), nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('installed_default', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_plugins_subject', 'plugins', ['subject'])

    # ── user_plugins 安装态（RLS 用户隔离） ─────────────────────────────
    op.create_table(
        'user_plugins',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('plugin_id', sa.String(), nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['auth.users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['plugin_id'], ['plugins.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'plugin_id'),
    )

    # ── 种子：35 个插件（提取自 frontend/src/mock/pluginItems.ts） ──────
    plugin_rows = [
        {'id': 'computer-use', 'name': 'Computer Use', 'description': 'Control Mac apps from Lemma', 'subject': 'general', 'icon_name': 'AppWindow', 'sort_order': 0, 'installed_default': True},
        {'id': 'spreadsheets', 'name': 'Spreadsheets', 'description': 'Create and edit spreadsheet files', 'subject': 'general', 'icon_name': 'Table', 'sort_order': 1, 'installed_default': True},
        {'id': 'presentations', 'name': 'Presentations', 'description': 'Create and edit presentations', 'subject': 'general', 'icon_name': 'Presentation', 'sort_order': 2, 'installed_default': True},
        {'id': 'slack', 'name': 'Slack', 'description': 'Read and manage study team channels', 'subject': 'general', 'icon_name': 'Slack', 'sort_order': 3, 'installed_default': False},
        {'id': 'linear', 'name': 'Linear', 'description': 'Track learning projects and tasks', 'subject': 'general', 'icon_name': 'Workflow', 'sort_order': 4, 'installed_default': False},
        {'id': 'paper-reader', 'name': 'Paper Reader', 'description': 'Extract claims, methods, and citations', 'subject': 'general', 'icon_name': 'FileText', 'sort_order': 5, 'installed_default': False},
        {'id': 'writing-coach', 'name': 'Writing Coach', 'description': 'Rewrite essays with clearer structure', 'subject': 'general', 'icon_name': 'PenTool', 'sort_order': 6, 'installed_default': False},
        {'id': 'course-builder', 'name': 'Course Builder', 'description': 'Turn materials into guided courses', 'subject': 'general', 'icon_name': 'BookOpenText', 'sort_order': 7, 'installed_default': False},
        {'id': 'study-agent', 'name': 'Study Agent', 'description': 'Plan reviews and follow-up sessions', 'subject': 'general', 'icon_name': 'Bot', 'sort_order': 8, 'installed_default': False},
        {'id': 'math-solver', 'name': 'Math Solver', 'description': 'Solve equations step by step', 'subject': 'math', 'icon_name': 'Calculator', 'sort_order': 9, 'installed_default': True},
        {'id': 'concept-tutor', 'name': 'Concept Tutor', 'description': 'Break down hard concepts into lessons', 'subject': 'math', 'icon_name': 'BrainCircuit', 'sort_order': 10, 'installed_default': False},
        {'id': 'physics-lab', 'name': 'Physics Lab', 'description': 'Simulate experiments and derive laws', 'subject': 'physics', 'icon_name': 'Atom', 'sort_order': 11, 'installed_default': False},
        {'id': 'molecule-builder', 'name': 'Molecule Builder', 'description': 'Build and visualize molecular structures', 'subject': 'chemistry', 'icon_name': 'FlaskConical', 'sort_order': 12, 'installed_default': False},
        {'id': 'bio-explorer', 'name': 'Bio Explorer', 'description': 'Map ecosystems and body systems', 'subject': 'biology', 'icon_name': 'Dna', 'sort_order': 13, 'installed_default': False},
        {'id': 'github', 'name': 'GitHub', 'description': 'Triage issues, PRs, and publish flows', 'subject': 'programming', 'icon_name': 'Github', 'sort_order': 14, 'installed_default': False},
        {'id': 'code-mentor', 'name': 'Code Mentor', 'description': 'Learn algorithms with hands-on problems', 'subject': 'programming', 'icon_name': 'Code2', 'sort_order': 15, 'installed_default': False},
        {'id': 'language-practice', 'name': 'Language Practice', 'description': 'Practice vocabulary and translation', 'subject': 'languages', 'icon_name': 'Languages', 'sort_order': 16, 'installed_default': False},
        {'id': 'timeline-historian', 'name': 'Timeline Historian', 'description': 'Trace events across civilizations', 'subject': 'history', 'icon_name': 'Landmark', 'sort_order': 17, 'installed_default': False},
        {'id': 'socratic-tutor', 'name': 'Socratic Tutor', 'description': 'Question your way to first principles', 'subject': 'philosophy', 'icon_name': 'Feather', 'sort_order': 18, 'installed_default': False},
        {'id': 'sky-atlas', 'name': 'Sky Atlas', 'description': 'Navigate constellations and deep sky objects', 'subject': 'astronomy', 'icon_name': 'Star', 'sort_order': 19, 'installed_default': False},
        {'id': 'music-theory', 'name': 'Music Theory', 'description': 'Master harmony, scales, and ear training', 'subject': 'music', 'icon_name': 'Music', 'sort_order': 20, 'installed_default': False},
        {'id': 'art-history', 'name': 'Art History', 'description': 'Decode masterpieces and art movements', 'subject': 'art', 'icon_name': 'Palette', 'sort_order': 21, 'installed_default': False},
        {'id': 'econ-modeler', 'name': 'Econ Modeler', 'description': 'Model supply, demand, and incentives', 'subject': 'economics', 'icon_name': 'TrendingUp', 'sort_order': 22, 'installed_default': False},
        {'id': 'legal-reader', 'name': 'Legal Reader', 'description': 'Read statutes and landmark case law', 'subject': 'law', 'icon_name': 'Gavel', 'sort_order': 23, 'installed_default': False},
        {'id': 'anatomy-atlas', 'name': 'Anatomy Atlas', 'description': 'Study human body systems in depth', 'subject': 'medicine', 'icon_name': 'HeartPulse', 'sort_order': 24, 'installed_default': False},
        {'id': 'mind-lab', 'name': 'Mind Lab', 'description': 'Explore cognition, behavior, and biases', 'subject': 'psychology', 'icon_name': 'Brain', 'sort_order': 25, 'installed_default': False},
        {'id': 'dig-site', 'name': 'Dig Site', 'description': 'Excavate artifacts and date the strata', 'subject': 'archaeology', 'icon_name': 'Gem', 'sort_order': 26, 'installed_default': False},
        {'id': 'philology-tools', 'name': 'Philology Tools', 'description': 'Trace word roots across languages', 'subject': 'linguistics', 'icon_name': 'BookMarked', 'sort_order': 27, 'installed_default': False},
        {'id': 'logic-trainer', 'name': 'Logic Trainer', 'description': 'Drill syllogisms, fallacies, and proofs', 'subject': 'logic', 'icon_name': 'GitFork', 'sort_order': 28, 'installed_default': False},
        {'id': 'latin-coach', 'name': 'Latin Coach', 'description': 'Read Caesar and Virgil with declension drills', 'subject': 'classics', 'icon_name': 'Scroll', 'sort_order': 29, 'installed_default': False},
        {'id': 'stats-visualizer', 'name': 'Stats Visualizer', 'description': 'See distributions and inference clearly', 'subject': 'statistics', 'icon_name': 'BarChart3', 'sort_order': 30, 'installed_default': False},
        {'id': 'cipher-workshop', 'name': 'Cipher Workshop', 'description': 'Break ciphers from Caesar to RSA', 'subject': 'cryptography', 'icon_name': 'Lock', 'sort_order': 31, 'installed_default': False},
        {'id': 'fossil-lab', 'name': 'Fossil Lab', 'description': 'Identify species from the fossil record', 'subject': 'paleontology', 'icon_name': 'Bone', 'sort_order': 32, 'installed_default': False},
        {'id': 'myth-map', 'name': 'Myth Map', 'description': 'Navigate pantheons and heroic cycles', 'subject': 'mythology', 'icon_name': 'Moon', 'sort_order': 33, 'installed_default': False},
        {'id': 'chess-tutor', 'name': 'Chess Tutor', 'description': 'Study openings, tactics, and endgames', 'subject': 'chess', 'icon_name': 'Target', 'sort_order': 34, 'installed_default': False},
    ]
    op.bulk_insert(sa.table(
        'plugins',
        sa.column('id', sa.String),
        sa.column('name', sa.String),
        sa.column('description', sa.String),
        sa.column('subject', sa.String),
        sa.column('icon_name', sa.String),
        sa.column('sort_order', sa.Integer),
        sa.column('installed_default', sa.Boolean),
    ), plugin_rows)

    # ── RLS（Supabase：auth.uid() 需 Supabase auth schema） ──────────────
    op.execute('ALTER TABLE plugins ENABLE ROW LEVEL SECURITY')
    # 静态目录公开读（任何登录用户可见）
    op.execute('CREATE POLICY plugins_read ON plugins FOR SELECT USING (true)')
    op.execute('ALTER TABLE user_plugins ENABLE ROW LEVEL SECURITY')
    op.execute(
        'CREATE POLICY user_plugins_isolation ON user_plugins '
        'USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('user_plugins')
    op.drop_table('plugins')
