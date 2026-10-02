"""空间目标（Space Goal）的 wire 契约，camelCase，与 `schemas/board_context.py` 同约定。

**读者只有两个，而且都只读**：Coordinator（决定）与 Method（表达）。
界面读的是投影好的结果，不是目标本身 —— 所以这里没有"给界面铺路"的字段。

`outcomeKind` 是**算出来的**，不是存的：它完全由 `purpose` 决定（见
`services/space_goal_service.outcome_kind`），存一份就是同一个事实有两个来源。
"""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

GoalStatus = Literal["draft", "active", "paused", "closed"]
GoalPurpose = Literal[
    "exam_performance", "understanding", "build_something", "other"
]
GoalOrigin = Literal["user_stated", "user_entered", "agent_proposed"]
GoalCloseReason = Literal[
    "system_no_further_value",
    "user_achieved",
    "user_abandoned",
    "user_superseded",
]
#: 结果由谁宣布。`externally_reported` = 只有学习者能看到结果（考分、交付物），
#: 系统永远不许对它宣布"达成"。
OutcomeKind = Literal["externally_reported", "system_observable"]

#: 一句话的目标陈述。「两个月后 TOEFL 117」和「想真正学懂线性代数」都要放得下。
TARGET_TEXT_MAX = 500
CONTEXT_MAX = 100


class _Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class SpaceGoalOut(_Camel):
    id: uuid.UUID
    project_id: uuid.UUID
    target_text: str
    deadline_at: datetime | None = None
    context: str | None = None
    purpose: GoalPurpose
    origin: GoalOrigin
    status: GoalStatus
    confirmed_at: datetime | None = None
    closed_reason: GoalCloseReason | None = None
    #: 由 `purpose` 算出。回答"这个目标的结果系统有没有资格判定"。
    outcome_kind: OutcomeKind
    created_at: datetime
    updated_at: datetime


class SpaceGoalCreateIn(_Camel):
    """建立一个目标。**永远是 `draft`** —— 确认是另一个动作，不是这个请求的一部分。"""

    target_text: str = Field(min_length=1, max_length=TARGET_TEXT_MAX)
    deadline_at: datetime | None = None
    context: str | None = Field(default=None, max_length=CONTEXT_MAX)
    purpose: GoalPurpose
    #: 默认 `user_entered`（有人在界面上填的）。从对话里抽出来的走 `user_stated`。
    origin: GoalOrigin = "user_entered"


class SpaceGoalUpdateIn(_Camel):
    """局部更新：只有真的发过来的字段会被写。

    `None` 在这里是一个真值（"清掉这一格"），所以 API 层读 `model_fields_set`
    而不是 `is not None` —— 否则"清空 deadline"就没法表达。
    """

    target_text: str | None = Field(default=None, min_length=1, max_length=TARGET_TEXT_MAX)
    deadline_at: datetime | None = None
    context: str | None = Field(default=None, max_length=CONTEXT_MAX)
    purpose: GoalPurpose | None = None


class SpaceGoalCloseIn(_Camel):
    """关闭一个目标。**理由必填**，而且它的前缀说明是谁关的。

    `system_*` 是系统的判断（可被新证据推翻）；`user_*` 是学习者的决定（不可推翻）。
    """

    reason: GoalCloseReason


#: 被读的那句话。它是一句话，不是一份文档 —— 超出这个长度的是粘贴。
GOAL_MESSAGE_MAX = 2000


class SpaceGoalExtractIn(_Camel):
    """请系统读一句话，看里面有没有这个空间的目标。"""

    message: str = Field(min_length=1, max_length=GOAL_MESSAGE_MAX)


class SpaceGoalSuggestionOut(_Camel):
    """读出来的建议 —— **不是一次写入**。

    `heard=False` 是**正常结果**（绝大多数话里没有目标），不是错误；客户端要把它
    当成一个普通回答，别当成失败弹窗。

    这个形状里**没有"回述句子"**：页面把它读出来之后是要给人**改**的，一段文字改完
    还得再解析一次，两边的说法迟早对不上。页面用这几个字段自己组一句话。
    """

    heard: bool
    target_text: str | None = None
    deadline_at: datetime | None = None
    context: str | None = None
    purpose: GoalPurpose | None = None
