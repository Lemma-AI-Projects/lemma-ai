"""API contracts for Free-Course (wire format camelCase, same convention as
schemas/course.py).

The tree/blueprint read mirrors what the frontend renders: units -> lessons with
each lesson's objective and its generated blueprint. The lesson read carries the
content objects WITHOUT the correct answer / expected key — those stay
server-side so a bad network capture can't leak the grading answer.
"""

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

_ALIAS = dict(
    alias_generator=to_camel, populate_by_name=True
)


class FreeCourseCreateIn(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    # The learner's own words (kept verbatim -> LearningIntent.raw_request).
    intent: str = Field(min_length=1)
    conversation_id: uuid.UUID | None = None


class FreeCourseCreateOut(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    course_id: uuid.UUID
    status: str = "building"


class FreeCourseStepEventOut(BaseModel):
    """The `step` SSE frame body: one FreeCourseEvent from ai/free_course.pipeline.

    This is a wire contract, so the event serializes under a fixed camelCase
    shape regardless of what the pipeline may add internally.
    """

    model_config = ConfigDict(**_ALIAS)

    step: str
    status: str  # started | finished | failed
    detail: str | None = None
    payload: dict | None = None
    error_code: str | None = None
    error_message: str | None = None


class LessonBlueprintOut(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    objective: str
    prerequisites: list[str] = Field(default_factory=list)
    sequence: list[str] = Field(default_factory=list)


class FreeLessonOut(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    id: uuid.UUID
    title: str
    objective: str | None = None
    blueprint: LessonBlueprintOut | None = None
    has_content: bool = False


class FreeUnitOut(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    id: uuid.UUID
    title: str
    objective: str | None = None
    lessons: list[FreeLessonOut] = Field(default_factory=list)


class FreeCourseDetailOut(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    id: uuid.UUID
    mode: str
    status: str
    title: str
    topic: str
    audience: str | None = None
    summary: str | None = None
    intent: dict | None = None
    units: list[FreeUnitOut] = Field(default_factory=list)


class PracticeOptionOut(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    id: str
    text: str


class LearningObjectOut(BaseModel):
    """A content object as the learner sees it: options yes, answer no.

    `answer` / `expected` are grading facts and are omitted on purpose. `hint` is
    shown after answering, not before, so it is safe to expose.
    """

    model_config = ConfigDict(**_ALIAS)

    id: uuid.UUID
    kind: str
    title: str
    body: str
    concept: str | None = None
    difficulty: str = "core"
    options: list[PracticeOptionOut] = Field(default_factory=list)
    hint: str | None = None


class FreeLessonRefOut(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    chapter_id: uuid.UUID
    title: str


class FreeLessonContentOut(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    chapter_id: uuid.UUID
    title: str
    objective: str
    objects: list[LearningObjectOut] = Field(default_factory=list)
    # The lesson that follows this one in the course's own order (spec §8's
    # "continue"), or None on the last lesson. Computed here rather than in the
    # client so the map order stays the single source of truth for what is next.
    next: FreeLessonRefOut | None = None


class ObservationIn(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    object_id: uuid.UUID
    option_id: str | None = None
    text: str | None = None
    confidence: int | None = Field(default=None, ge=1, le=5)

    @property
    def as_learner_response(self) -> dict:
        return {
            "option_id": self.option_id,
            "text": self.text,
            "confidence": self.confidence,
        }


class AnswerFeedbackOut(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    verdict: Literal["correct", "partial", "incorrect"]
    feedback: str
    hint: str | None = None
    is_correct: bool | None = None