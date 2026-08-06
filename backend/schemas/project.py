"""API contracts for project / learn space CRUD (rules 第十章). Wire camelCase."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class AgentProfileIn(BaseModel):
    """Companion agent persona bound to the learn space (onboarding v1)."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    agent_name: str = Field(min_length=1, max_length=50)
    personality: str = Field(min_length=1, max_length=500)
    teaching_style: str = Field(min_length=1, max_length=500)
    welcome_message: str = Field(min_length=1, max_length=1000)


class ProjectCreateIn(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str = Field(min_length=1, max_length=100)
    # Optional bound companion agent; absent for plain projects / legacy flows.
    agent: AgentProfileIn | None = None


class ProjectUpdateIn(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str = Field(min_length=1, max_length=100)


class ProjectOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    name: str
    updated_at: datetime
    agent_name: str | None = None
    agent_personality: str | None = None
    agent_teaching_style: str | None = None
    agent_welcome: str | None = None


class ProjectConversationOut(BaseModel):
    """Project chat list item: conversation + last-user-message preview."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: uuid.UUID
    title: str | None
    last_message: str | None
    updated_at: datetime
