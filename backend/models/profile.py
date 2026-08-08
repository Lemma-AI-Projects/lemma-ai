import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base

# Reference-only stub of Supabase's auth.users table. Supabase owns this table,
# so it is excluded from migrations (see alembic/env.py); it exists here only so
# the profiles foreign key below can resolve its target.
auth_users = Table(
    "users",
    Base.metadata,
    Column("id", UUID(as_uuid=True), primary_key=True),
    schema="auth",
)


class Profile(Base):
    __tablename__ = "profiles"
    __table_args__ = (
        CheckConstraint(
            "subscription_plan in ('free', 'pro')",
            name="ck_profiles_subscription_plan",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    email: Mapped[str] = mapped_column(String, nullable=False)
    nickname: Mapped[str | None] = mapped_column(String, nullable=True)
    subscription_plan: Mapped[str] = mapped_column(
        String, nullable=False, server_default="free"
    )
    # One-time credits balance (purchased via PayPal). Server is authoritative;
    # the purchased amount is always recomputed from the pack, never trusted from
    # the client. Starts at 0 for every new user.
    credits_balance: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    avatar_color: Mapped[str] = mapped_column(String, nullable=False)
    # New-user onboarding gate (capacity-first flow). `has_completed_onboarding`
    # is false until the 5-step flow finishes; `onboarding_interests` holds the
    # free-form answer captured on the first screen and seeds the first learn
    # space / agent generation.
    has_completed_onboarding: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    onboarding_interests: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
