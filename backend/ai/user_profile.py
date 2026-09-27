"""Structured outputs for the page about the person (`/me`).

Deliberately its own module rather than another entry in `ai/coursegen/types.py`
or `ai/free_course/types.py`: those describe courses, this one describes a human
being, and the prompts that produce them must not be able to see each other's
shapes. One type so far — the page's only model call is "read this page, draft
the background".
"""

from pydantic import BaseModel, Field


class BackgroundDraft(BaseModel):
    """One paragraph about the learner, read off a page they pointed at."""

    background: str = Field(
        default="",
        description=(
            "第一人称的简短背景描述，只写网页正文里确实出现的、与学习背景有关的事实；"
            "没有可用信息时返回空字符串。"
        ),
    )
    source_title: str | None = Field(
        default=None,
        description="网页标题，用于在页面上标注这段草稿是从哪一页读来的。",
    )
