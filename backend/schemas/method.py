"""API contract for the Method layer.

Wire format is camelCase, same convention as the rest of `schemas/`.

The list is served from the registry (`ai/methods`) rather than declared here:
a fixed `Literal` would mean adding a method requires editing the schema, the
frontend and the tests — three copies of one fact. Whether a *requested* name is
valid is answered by the same registry (see `schemas/ai.py`).
"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class MethodOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    # Stable id used on the wire and stored on the conversation.
    name: str
    # What the picker shows. English product name; the frontend may localise it.
    display_name: str
    # One sentence for the picker's helper text — how this method teaches.
    description: str


class MethodStatusOut(BaseModel):
    """Focus 顶部那颗状态栏要说的东西。

    **刻意没有 method 的名字，也没有它的 display name。** 界面上它只出现动词
    （"先请你自己走一遍"），不出现术语（"苏格拉底式"）—— 一个名字会邀请用户去
    **评价这种教法**，一个动词只会邀请他去做。所以名字不是忘了发，是不给发：
    少一个字段，界面就少一种做错的方式。

    四格里没有一格是进度或分数。`completion` 是**判据**（什么算过），不是完成度 ——
    对"考到 117 分"这种只有学习者能看到结果的目标，系统没有证据说完成了多少。
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    #: ① 我们现在在做什么。
    system_move: str
    #: ② 要你做什么。
    learner_move: str
    #: ③ 什么算完成。
    completion: str
    #: 这件事和你的目标什么关系。这个空间没有目标时是 `None` —— 那就不说。
    goal_relation: str | None = None
