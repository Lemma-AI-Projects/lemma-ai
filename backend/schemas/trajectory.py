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
