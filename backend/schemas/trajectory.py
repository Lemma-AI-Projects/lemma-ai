"""轨迹（Trajectory）的接口契约。Wire format 是 camelCase（与其它 schema 一致）。

⚠️ 这份契约里**没有判断字段** —— 没有"什么变了""这对接下来的意义"。
不是还没做，是这一版刻意不写：那类句子要有依据才配写，而依据此刻可能不存在。
界面上对应的位置会如实说"没有记录支撑"。
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

TrajectoryKind = Literal[
    "material",
    "annotation",
    "goal",
    "memory",
    "conversation",
    "evidence",
    "bundle",
    "decision",
    "notification",
]

#: 时间的可信度。`approx` = 这张表里没有时间戳，取的是邻居的时间（目前只有边注）。
TimeAccuracy = Literal["exact", "approx"]


class TrajectoryEventOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    kind: TrajectoryKind
    at: datetime
    at_accuracy: TimeAccuracy
    title: str
    #: 这条是从哪一行来的。`table` + `id` 合起来就是依据本身 —— 点得回去。
    source: dict[str, Any]
    #: 点回原处（前端路由）。没有可去的地方就是 null，而不是一个假链接。
    href: str | None = None
    #: 这条经历挂在哪个知识点下面。**今天只有证据有**（`knowledge_evidence.item_id`），
    #: 其余八类是 null —— 树上它们只能站在"挂不上"那一栏。别把它 null 当成"没读到"。
    item_id: uuid.UUID | None = None


class KnowledgePointOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: uuid.UUID
    label: str
    #: `concept` / …（`models/knowledge.py` 的取值）
    kind: str
    #: 这个点是**谁放进来的**（`agent_drafted` / `user_stated` / …）。
    #: ⚠️ 不是判断，是这张表里存的一个字段 —— 界面上可以如实显示。
    origin: str
    status: str


class PrereqEdgeOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    #: `from_item_id` 是**前提**；`to_item_id` 是它之后才谈得上的那个。
    from_item_id: uuid.UUID
    to_item_id: uuid.UUID
    confidence: str


class TrajectoryKnowledgeOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    #: 这个空间的知识骨架 —— **树的主干**。
    #: ⚠️ 它**不是事件**：事件回答"哪天发生了什么"，它回答"存在哪些要学的东西"。
    points: list[KnowledgePointOut]
    #: 只包含两端都在 `points` 里的边；半个边画不出树。
    prereqs: list[PrereqEdgeOut]


class TrajectorySpanOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    #: 最早与最晚一条的时间。**空空间是 null**，不是"今天"。
    from_at: datetime | None = None
    to_at: datetime | None = None


class TrajectoryOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    space_id: uuid.UUID
    span: TrajectorySpanOut
    #: 从早到晚。轨迹是拿来"从上往下读一遍走过的路"的。
    events: list[TrajectoryEventOut]
    #: 归不到这个空间、但确实发生了的东西（按来源计数）。目前只有一种：
    #: 通知表里没有空间标记的那些。**数出来**，不猜。
    unattributed: dict[str, int]
    #: 事件数到了上限、只返回了最近的这些。
    truncated: bool
    #: 知识骨架。**一个空空间也会返回它** —— 知识点不属于时间。
    knowledge: TrajectoryKnowledgeOut
