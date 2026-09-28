"""Mala 投送包的 wire 契约（camelCase，与 `schemas/ai.py` 同约定）。

**前端设计从这一份开始就够了**：投送什么、读回什么、会被怎么拒绝。
这里没有画板的坐标系、没有 tldraw 的 id 规则 —— `boundingBox` 与 `shapeId` 都是
前端的东西，后端原样存、原样给（它只用它们"回到出处"）。
"""

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

#: 概念节点的掌握度三态，与 Learner State 用同一套词。
Mastery = Literal["known", "learning", "due"]


class _Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class BoardContextItemIn(_Camel):
    """一个被选中形状的语义投影 —— 前端 analyzer 的产物，后端不再解析。"""

    shape_id: str = Field(min_length=1, max_length=128)
    type: str = Field(min_length=1, max_length=64)
    text: str = Field(max_length=4000)
    #: 缺席 = 这个形状没有掌握度可言（例如一张纯文本卡）。
    mastery: Mastery | None = None
    #: 它连到的其它形状。V0 用它表达"它们之间的连接"，不把关系单独建项。
    connected_ids: list[str] = Field(default_factory=list)


class BoardContextIn(_Camel):
    """一次投送。`items` 的上限在 service 里判（24），超了报 422 而不是截断。"""

    project_id: uuid.UUID
    label: str | None = Field(default=None, max_length=200)
    source: Literal["selection", "cluster"] = "selection"
    selection_mode: Literal["rectangle", "lasso"] = "rectangle"
    bounding_box: dict[str, Any] | None = None
    items: list[BoardContextItemIn] = Field(default_factory=list)


class BoardContextOut(_Camel):
    id: uuid.UUID
    project_id: uuid.UUID
    label: str | None = None
    source: Literal["selection", "cluster"]
    selection_mode: Literal["rectangle", "lasso"]
    #: 由 `items` 长度算出，不额外存一列 —— 一个数不该有两个来源。
    item_count: int
    created_at: datetime
    items: list[BoardContextItemIn] = Field(default_factory=list)
