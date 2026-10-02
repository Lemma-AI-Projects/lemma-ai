"""Structured output for "what goal did the learner just state?".

Deliberately its own module rather than a field on `ai/user_profile.py` or
`ai/coursegen/types.py`: those describe a person or a course, this one describes
**a direction**, and the prompt that produces it must not be able to see the
others' shapes.

Two decisions here are about restraint rather than capability:

  * **`confidence` is not a score.** It has three values, and `none` is a normal
    answer — most sentences a learner types do not contain a goal, and an
    extractor that always produces one is an extractor that invents them.
  * **There is no `restatement` field.** The obvious next move would be to have
    the model write the sentence the page shows back ("我理解你的目标是…"). It is
    refused because that sentence is what the learner **edits**: a paragraph
    would have to be re-parsed on every keystroke, and the two readings would
    drift. The page composes one from these fields instead, and the fields are
    what get stored.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

#: What the goal is for. Mirrors `models.space_goal.GOAL_PURPOSES`, plus `other`
#: as a real answer — a goal that fits none of the three must not be forced into
#: one just to fill a field.
GoalPurposeGuess = Literal[
    "exam_performance", "understanding", "build_something", "other"
]

#: How sure the reading is. `none` means "this sentence has no goal in it",
#: which is the most common correct answer.
GoalConfidence = Literal["high", "none"]


class GoalDraft(BaseModel):
    """One goal, as heard in one sentence. Never written to storage as-is."""

    target_text: str = Field(
        default="",
        description=(
            "学习者想达到的结果，用他自己的措辞，60 字以内。他这句话里没有目标时返回空字符串。"
        ),
    )
    deadline_at: datetime | None = Field(
        default=None,
        description=(
            "只有他明确说出时间才填，且必须换算成绝对时间（RFC3339）。没提就留空。"
        ),
    )
    context: str | None = Field(
        default=None,
        description="这件事发生在哪个场景，一个词（如 TOEFL / 线性代数）。没有就留空。",
    )
    purpose: GoalPurposeGuess = Field(
        default="other", description="这个目标是为了什么，四选一。"
    )
    confidence: GoalConfidence = Field(
        default="none",
        description="high = 他明确说了目标；none = 这句话里没有目标。",
    )

    def heard_a_goal(self) -> bool:
        """Whether this is usable at all — the caller's one guard.

        A model that answered `high` but left the text blank is still an empty
        reading, and a blank target is refused by the column anyway; checking it
        here means the API can answer "没听懂" instead of surfacing a database
        error.
        """
        return self.confidence == "high" and bool(self.target_text.strip())
