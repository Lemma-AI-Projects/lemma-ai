"""API contracts for learn space onboarding (v1 轻度自定义). Wire format camelCase."""

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class AgentDraftIn(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    space_name: str = Field(min_length=1, max_length=100)


class AgentDraftOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    agent_name: str
    personality: str
    teaching_style: str
    welcome_message: str
