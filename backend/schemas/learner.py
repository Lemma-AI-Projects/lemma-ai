"""Learner 记忆读接口响应 Schema（L1 主线闭环，2026-08-20）。

前端面板/今日任务 消费的 learner 数据模型。一律让引擎的 snake_case 字段
以 camelCase 输出（照 users.py / overview.py 的 alias_generator 惯例）。
"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


class KnowledgeNodeOut(_CamelModel):
    node_id: int
    concept: str
    domain: str
    mastery: float
    confidence: float
    attempts: int
    successes: int
    last_test: str | None = None
    last_exposed: str | None = None
    source: str = ""


class DueReviewOut(_CamelModel):
    node_id: int
    concept: str
    domain: str
    mastery: float
    ease: float
    interval: int
    due: str | None = None
    last_review: str | None = None


class MemoryOverviewOut(_CamelModel):
    enabled: bool
    concept_count: int
    mastery_buckets: dict[str, int]
    today_due_count: int


class LearnerDisabledOut(_CamelModel):
    """门控关时三端点统一返回的降级结构（前端据此优雅降级）。"""

    enabled: bool = False