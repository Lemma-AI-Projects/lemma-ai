import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

SubscriptionPlan = Literal["free", "pro"]


class UserMe(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: uuid.UUID
    email: str
    nickname: str | None
    subscription_plan: SubscriptionPlan
    avatar_color: str
    created_at: datetime


class UserMeUpdateIn(BaseModel):
    """Partial update of the identity fields the product lets a user change.

    Only `nickname` for now: email is Supabase-owned and is refreshed from the
    verified token on every read (see `user_service.get_or_create_profile`), so
    accepting it here would let the two disagree.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    nickname: str | None = Field(default=None, max_length=64)
