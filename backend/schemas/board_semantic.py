"""API contracts for semantic board analysis. Wire format camelCase."""

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class BoardShapeSemanticIn(BaseModel):
    """裁剪载荷：只传语义所需字段，不传坐标（控制 token 成本）。"""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    text: str
    type: str
    mastery: str | None = None


class BoardClusterIn(BaseModel):
    """规则聚类结果（前端 analyzeRegion 产出），供 LLM 命名。"""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    member_ids: list[str]
    label: str  # 规则初名（如「点积」）——LLM 在此基础上细化


class BoardSemanticRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    shapes: list[BoardShapeSemanticIn] = Field(min_length=2, max_length=200)
    clusters: list[BoardClusterIn] = Field(default_factory=list, max_length=20)


class BoardSemanticClusterOut(BaseModel):
    """LLM 命名的簇：智能标签 + 一句话主题说明。"""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    cluster_id: str
    label: str
    description: str


class BoardSemanticResponse(BaseModel):
    """LLM 只做命名与描述，不产坐标（布局仍由前端规则层负责）。"""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    clusters: list[BoardSemanticClusterOut]
    intent_description: str
