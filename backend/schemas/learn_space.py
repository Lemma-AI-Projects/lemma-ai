"""API contracts for learn space onboarding. Wire format camelCase."""

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class AgentDraftIn(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    space_name: str = Field(min_length=1, max_length=100)
    # 用户主导自定义（onboarding v2）：已指定名字 / 性格 / 教学风格时，
    # 生成遵循用户偏好；全部缺省则完全由 AI 设计。
    agent_name: str | None = Field(default=None, max_length=50)
    personality: str | None = Field(default=None, max_length=300)
    teaching_style: str | None = Field(default=None, max_length=300)


class AgentDraftOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    agent_name: str
    personality: str
    teaching_style: str
    welcome_message: str
