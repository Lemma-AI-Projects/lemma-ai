"""Learner-progress contracts that aren't scoped to a single course tree.

Per-point progress rides on the course snapshot instead (schemas/course.py):
only the cross-course views live here.
"""

from datetime import datetime, timedelta

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

# 周进度卡一次只问一周；上限是为了挡住手写的区间把整部历史拉进内存。
_MAX_WINDOW = timedelta(days=53)


class CompletionsQuery(BaseModel):
    """查询窗口 [start, end)，由客户端按自己的时区算好再传过来。

    两端都要求带时区：窗口的意义完全取决于「谁的午夜」，而 naive 时间到了
    timestamptz 比较那一步只会炸成 500，不如在契约层就拒掉。
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    start: AwareDatetime = Field(description="窗口起点，含（ISO 8601，带时区）。")
    end: AwareDatetime = Field(description="窗口终点，不含（ISO 8601，带时区）。")

    @model_validator(mode="after")
    def _check_window(self) -> "CompletionsQuery":
        if self.end <= self.start:
            raise ValueError("end_must_follow_start")
        if self.end - self.start > _MAX_WINDOW:
            raise ValueError("window_too_large")
        return self


class CompletionsOut(BaseModel):
    """Completion instants inside a requested window, oldest first.

    Raw instants rather than per-day counts: which calendar day a completion
    falls on depends on the learner's timezone, which the server doesn't know.
    The client asks for a window it computed locally and buckets the result.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    completed_at: list[datetime] = Field(default_factory=list)
