"""add roster tables: organizations, classes, enrollments, integrations

Single-head revision chained onto the payments migration (b3c5d7e9f1a2), which
is this branch's head. Additive only: five new tables, no existing table is
touched.

Revision ID: c1d2e3f4a5b6
Revises: b3c5d7e9f1a2
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, Sequence[str], None] = "b3c5d7e9f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("region", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_table(
        "classes",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "org_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("name", sa.String(), nullable=False),
        # Which channel created the class: lti | google_classroom | csv
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("external_class_id", sa.String(), nullable=False),
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
        sa.UniqueConstraint(
            "provider", "external_class_id", name="uq_classes_provider_external"
        ),
    )
    op.create_index("ix_classes_org_id", "classes", ["org_id"])

    op.create_table(
        "enrollments",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "class_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("classes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("auth.users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("class_id", "user_id", name="uq_enrollments_class_user"),
        sa.CheckConstraint(
            "role in ('student', 'teacher', 'admin')", name="ck_enrollments_role"
        ),
    )

    op.create_table(
        "roster_integrations",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("external_issuer", sa.String(), nullable=False),
        sa.Column(
            "org_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("label", sa.String(), nullable=True),
        sa.Column("lti_client_id", sa.String(), nullable=True),
        sa.Column("lti_deployment_id", sa.String(), nullable=True),
        sa.Column("lti_oidc_auth_url", sa.String(), nullable=True),
        sa.Column("lti_platform_jwks_url", sa.String(), nullable=True),
        sa.Column("lti_platform_token_url", sa.String(), nullable=True),
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
        sa.UniqueConstraint(
            "provider",
            "external_issuer",
            "lti_client_id",
            "lti_deployment_id",
            name="uq_roster_integrations_deployment",
        ),
    )

    op.create_table(
        "roster_sync_runs",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "integration_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("roster_integrations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("trigger", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("classes_seen", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("members_seen", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("detail", sa.String(), nullable=True),
        sa.Column(
            "started_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "finished_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_roster_sync_runs_integration", "roster_sync_runs", ["integration_id"]
    )

    op.create_table(
        "external_identities",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column(
            "integration_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("roster_integrations.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("external_user_id", sa.String(), nullable=False),
        sa.Column(
            "user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("auth.users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("display_name", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "last_seen_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "provider",
            "integration_id",
            "external_user_id",
            name="uq_external_identities_provider_user",
        ),
    )
    op.create_index(
        "ix_external_identities_user_id", "external_identities", ["user_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_external_identities_user_id")
    op.drop_table("external_identities")
    op.drop_index("ix_roster_sync_runs_integration")
    op.drop_table("roster_sync_runs")
    op.drop_table("roster_integrations")
    op.drop_table("enrollments")
    op.drop_index("ix_classes_org_id")
    op.drop_table("classes")
    op.drop_table("organizations")
