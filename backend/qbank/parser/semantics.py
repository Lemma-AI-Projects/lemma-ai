"""Semantics HTML can't express, derived from the type dictionary + answers.

When a rule cannot decide, the answer is 'unknown' — the frontend then uses a
conservative superset control. Never guess (前端方案 §11).
"""

import re
from typing import Literal

_MULTI_TYPE = re.compile(r"多选|多项|不定项")
_SINGLE_TYPE = re.compile(r"单选|单项|选择")
_JUDGE_TYPE = re.compile(r"判断")
_EXCLUSIVE_POOL_TYPE = re.compile(r"七选五|选五|任务型|选句")

Select = Literal["single", "multiple", "unknown"]


def select_for(type_name: str | None, answer_letters: int | None) -> Select:
    name = type_name or ""
    if _MULTI_TYPE.search(name):
        return "multiple"
    if answer_letters is not None and answer_letters > 1:
        return "multiple"
    if answer_letters == 1:
        return "single"
    if _SINGLE_TYPE.search(name):
        return "single"
    return "unknown"


def looks_like_judge(type_name: str | None) -> bool:
    return bool(_JUDGE_TYPE.search(type_name or ""))


def pool_reuse_for(type_name: str | None) -> Literal["exclusive", "unknown"]:
    return "exclusive" if _EXCLUSIVE_POOL_TYPE.search(type_name or "") else "unknown"
