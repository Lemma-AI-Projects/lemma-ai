"""Roster domain: organisations, classes, enrolments, and the links that tie
them to an external LMS.

Design notes that matter:

- **Identity is keyed by (provider, external_user_id), never by email.** LMS
  users change email addresses, districts reuse group mailboxes, and the same
  person has different addresses across institutions. LTI gives us `sub`;
  Google Classroom gives us `userId`.
- `classes.external_class_id` is the LMS-side course/class id (LTI `context.id`,
  Classroom `courseId`), so a class can be re-synced without duplicating.
- Everything hangs off `roster_integrations`: one row per installed deployment
  (LTI: issuer + client_id + deployment_id; Classroom: domain).
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class Organization(Base):
    """A school, district, or other institution."""

    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    region: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )


class ClassGroup(Base):
    """A class/section as it exists in Lemma (mirrors one LMS course)."""

    __tablename__ = "classes"
    __table_args__ = (
        UniqueConstraint(
            "provider", "external_class_id", name="uq_classes_provider_external"
        ),
        Index("ix_classes_org_id", "org_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    # "lti" | "google_classroom" | "csv" — which channel created it.
    provider: Mapped[str] = mapped_column(String, nullable=False)
    external_class_id: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class Enrollment(Base):
    """A user's membership in a class, with the role the LMS reported."""

    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("class_id", "user_id", name="uq_enrollments_class_user"),
        CheckConstraint(
            "role in ('student', 'teacher', 'admin')", name="ck_enrollments_role"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    class_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("classes.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(
        String, nullable=False, server_default="active"
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )


class RosterIntegration(Base):
    """One installed deployment of an LMS channel.

    LTI columns are populated together: the tool looks an incoming launch up by
    (issuer, client_id, deployment_id) before it will trust anything else.
    Secrets (our private key) never live here — only public platform endpoints.
    """

    __tablename__ = "roster_integrations"
    __table_args__ = (
        UniqueConstraint(
            "provider",
            "external_issuer",
            "lti_client_id",
            "lti_deployment_id",
            name="uq_roster_integrations_deployment",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    provider: Mapped[str] = mapped_column(String, nullable=False)
    # LTI: the platform issuer. Classroom: the Workspace domain.
    external_issuer: Mapped[str] = mapped_column(String, nullable=False)
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
    )
    label: Mapped[str | None] = mapped_column(String, nullable=True)
    # ── LTI 1.3 platform endpoints (from the platform's tool registration) ──
    lti_client_id: Mapped[str | None] = mapped_column(String, nullable=True)
    lti_deployment_id: Mapped[str | None] = mapped_column(String, nullable=True)
    lti_oidc_auth_url: Mapped[str | None] = mapped_column(String, nullable=True)
    lti_platform_jwks_url: Mapped[str | None] = mapped_column(String, nullable=True)
    lti_platform_token_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class RosterSyncRun(Base):
    """Audit of one roster pull, so a teacher can see what happened."""

    __tablename__ = "roster_sync_runs"
    __table_args__ = (Index("ix_roster_sync_runs_integration", "integration_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    integration_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roster_integrations.id", ondelete="CASCADE"),
        nullable=False,
    )
    trigger: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    classes_seen: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    members_seen: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    detail: Mapped[str | None] = mapped_column(String, nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )


class ExternalIdentity(Base):
    """Maps an LMS account to a Lemma user.

    The mapping key is (provider, integration_id, external_user_id). Email is
    stored for display only and is deliberately NOT part of the key.
    """

    __tablename__ = "external_identities"
    __table_args__ = (
        UniqueConstraint(
            "provider",
            "integration_id",
            "external_user_id",
            name="uq_external_identities_provider_user",
        ),
        Index("ix_external_identities_user_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    provider: Mapped[str] = mapped_column(String, nullable=False)
    integration_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roster_integrations.id", ondelete="CASCADE"),
        nullable=True,
    )
    # LTI `sub` / Classroom `userId` — stable for the lifetime of the account.
    external_user_id: Mapped[str] = mapped_column(String, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    display_name: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
