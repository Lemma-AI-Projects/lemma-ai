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

from ai.free_course.persona import CourseVolume, Depth, Focus, Pace

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
    # 问卷答案（course_volume/depth/focus/pace + skip）。没答过是 None ——
    # 前端据此决定要不要显示「按什么生成」的 chips，而不是渲染一排空标签。
    tuning: dict | None = None
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


class CourseTuningOptionOut(BaseModel):
    model_config = ConfigDict(**_ALIAS)
    value: str
    label: str


class CourseTuningQuestionOut(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    key: str  # course_volume|depth|focus|pace
    title: str  # 体量/深度/侧重/节奏
    options: list[CourseTuningOptionOut] = Field(default_factory=list)


class CourseTuningStartOut(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    defaults: dict  # UserProfile.model_dump(by_alias=True)
    questions: list[CourseTuningQuestionOut] = Field(default_factory=list)


class CourseTuningIn(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    volume: CourseVolume | None = None
    depth: Depth | None = None
    focus: Focus | None = None
    pace: Pace | None = None
    skip: bool = Field(default=False, strict=True)


# --- Blueprint edit (全量编辑) -------------------------------------------
#
# 载荷是**声明式的完整期望树**，不是一串 op：
# 编辑本来就要以整棵树为单位才安全（增删改排一次算清），
# 而且 op 序列会让"用户改了 A 又改回来"变成两条要按序执行的操作，更难对齐。
#
# `id` 为 None = 新增（后端生成 id）。**已存在节点的 id 必须原样回传** ——
# 后端按 id 做增量 diff，认不出的 id 一律拒绝（不做"忽略陌生 id"这种静默行为）。
# 语义是「全量覆盖」：没回传的节点 = 要删；`objective` 传 None = 清空。


class CourseLessonEditIn(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    id: uuid.UUID | None = None
    title: str = Field(min_length=1, max_length=200)
    objective: str | None = None


class CourseUnitEditIn(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    id: uuid.UUID | None = None
    title: str = Field(min_length=1, max_length=200)
    lessons: list[CourseLessonEditIn] = Field(default_factory=list)


class CourseTreeEditIn(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    units: list[CourseUnitEditIn] = Field(default_factory=list)


# --- Teaching session (Hyperknow-style) -------------------------------------
#
# Same zero-trust rule as the lesson read: a question travels with its options
# (the learner has to see them) but never with `answer` / `expected` — the
# verdict for a choice question is decided server-side, so the correct option
# must not be sitting in the network response.


class BoardPointOut(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    x: float
    y: float


class BoardActionOut(BaseModel):
    """One board action, as the player receives it."""

    model_config = ConfigDict(**_ALIAS)

    kind: str
    # Render position lives on `points` when the model shaped a curve; a plain
    # segment uses at -> to. Both are in the abstract 1000x600 board space.
    at: BoardPointOut | None = None
    to: BoardPointOut | None = None
    points: list[BoardPointOut] = Field(default_factory=list)
    shape: str | None = None
    text: str | None = None
    color: str = "ink"
    size: str = "m"
    id: str | None = None
    target: str | None = None
    duration_ms: int | None = None
    # Which narration sentence this action belongs to — the sync contract.
    cue: int = 0


class TeachingQuestionOut(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    kind: Literal["open", "choice"]
    prompt: str
    options: list[PracticeOptionOut] = Field(default_factory=list)
    hint: str | None = None


class TeachingStepOut(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    id: str
    title: str | None = None
    branch: str | None = None
    narration: str
    actions: list[BoardActionOut] = Field(default_factory=list)
    question: TeachingQuestionOut | None = None


class SessionTranscriptEntryOut(BaseModel):
    """What the learner did at one stopping point."""

    model_config = ConfigDict(**_ALIAS)

    step_id: str
    signal: str
    text: str | None = None
    option_id: str | None = None
    verdict: str | None = None
    feedback: str | None = None


class TeachingSessionOut(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    session_id: uuid.UUID
    chapter_id: uuid.UUID
    title: str
    objective: str
    status: str
    # Index of the next step to play. The full plan is returned (not just the
    # remainder) so a refresh mid-session can restore the transcript too.
    cursor: int
    steps: list[TeachingStepOut] = Field(default_factory=list)
    transcript: list[SessionTranscriptEntryOut] = Field(default_factory=list)
    # False when the chapter has no generated lesson yet — the caller must run
    # lesson/stream first, and the UI says so instead of opening an empty board.
    has_content: bool = True


class TeachingTurnIn(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    # answer | confused | interrupt — see ai/free_course/teaching/types.py.
    signal: Literal["answer", "confused", "interrupt"]
    # Which step's question is being answered (absent for confused/interrupt).
    step_id: str | None = None
    text: str | None = Field(default=None, max_length=2000)
    option_id: str | None = None
    # Where the learner had got to. Sent by the client so a turn is enough to
    # keep the row in step without a second round trip per step.
    cursor: int | None = None


class TeachingTurnOut(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    verdict: str | None = None
    feedback: str | None = None
    steps: list[TeachingStepOut] = Field(default_factory=list)
    cursor: int = 0


class SessionProgressIn(BaseModel):
    model_config = ConfigDict(**_ALIAS)

    cursor: int = Field(ge=0)
