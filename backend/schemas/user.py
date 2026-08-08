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
    # New-user onboarding gate（容量首屏流程）：false 时前端拦截到 /onboarding。
    has_completed_onboarding: bool
    onboarding_interests: str | None
    created_at: datetime
