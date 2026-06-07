import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict
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
