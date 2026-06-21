"""API contract for the chapter overview (学习向章节概述). Wire format is camelCase.

Two endpoints share this module's intent:
- GET  .../overview         -> ChapterOverviewOut (fast read; ready ⇒ markdown).
- GET  .../overview/stream  -> SSE (reuses ai/streaming.py: preparing/reasoning/
  delta(markdown)/usage/done/error), used when the overview isn't ready yet.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ChapterOverviewOut(BaseModel):
    """Fast read of a chapter's cached overview.

    status `ready` ⇒ `markdown` is the finished overview; any other status ⇒
    `markdown` is null and the page should open the SSE stream to (re)generate.
    """

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    status: Literal["ready", "pending", "generating", "failed"]
    markdown: str | None = None
