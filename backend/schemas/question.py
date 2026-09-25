"""API contract for the question bank (rules 第十章). Wire format is camelCase.

This module is the contract truth; frontend/src/types/question.ts mirrors it.
Differences from the frontend proposal (前端方案 §3.3), all additive:
- QuestionSetView / QuestionSetSummary carry `status`
  (generating | ready | empty | failed); a generating set has no questions.
- QuestionSetView carries `openAttempt`: results already submitted in the
  learner's open session, so an immediate-mode run survives a refresh.
- QuestionMeta.source.provider is an open string (only "xkw" today).
- AttemptResult adds optional `submittedAt` / `attemptSessionId`.
- contentVersion is "{parserVersion}.{hash12}" — still opaque to the client.

The answer view (QuestionView) never contains reference answers or
explanations; those ride only on AttemptResult.review, after grading.
"""

import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class _Wire(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ---------- answer view ----------


class RichHtml(_Wire):
    html: str


SlotMechanism = Literal["choice", "pool-assign", "text", "judge", "essay", "unsupported"]
SlotGrading = Literal["auto", "manual", "none", "unknown"]


class BlankPresentation(_Wire):
    style: Literal["underline", "bracket"]
    size: int | None
    inline_label: str | None


class ResponseSlot(_Wire):
    id: str
    mechanism: SlotMechanism
    grading: SlotGrading
    option_group_id: str | None
    select: Literal["single", "multiple", "unknown"] | None
    blank: BlankPresentation | None
    anchored: bool


class QuestionOption(_Wire):
    id: str
    label: str
    content: RichHtml


class OptionGroup(_Wire):
    id: str
    options: list[QuestionOption]
    cols: int | None
    layout: Literal["table", "inline", "unknown"]
    reuse: Literal["exclusive", "allowed", "unknown"] | None
    anchored: bool


class MediaAsset(_Wire):
    kind: Literal["audio", "video", "image"]
    src: str
    title: str | None
    duration_seconds: int | None
    poster: str | None


class SubQuestion(_Wire):
    id: str
    label: str
    stem: RichHtml | None
    slots: list[ResponseSlot]
    option_groups: list[OptionGroup]
    media: list[MediaAsset]


class QuestionSource(_Wire):
    provider: str
    external_id: str
    source_kind: Literal["premium", "massive", "paper", "other"]


class KnowledgePoint(_Wire):
    id: str
    name: str


class QuestionMeta(_Wire):
    source: QuestionSource
    type_id: str | None
    type_name: str | None
    difficulty: float | None
    difficulty_level: Literal[17, 18, 19, 20, 21] | None
    knowledge_points: list[KnowledgePoint]
    years: list[int]
    source_papers: list[str]
    course_name: str | None


class RawBlocks(_Wire):
    stem: RichHtml
    answer: RichHtml | None
    explanation: RichHtml | None


class QuestionView(_Wire):
    id: str
    content_version: str
    structure: Literal["parsed", "raw"]
    numbering: Literal["sequential", "per-question", "none"]
    stem: RichHtml
    slots: list[ResponseSlot]
    option_groups: list[OptionGroup]
    sub_questions: list[SubQuestion]
    media: list[MediaAsset]
    meta: QuestionMeta
    raw: RawBlocks | None


QuestionSetKind = Literal["quiz", "assignment", "practice", "paper"]
QuestionSetMode = Literal["batch", "immediate"]
QuestionSetStatus = Literal["generating", "ready", "empty", "failed"]


class QuestionSetSection(_Wire):
    id: str
    title: str | None
    instructions: RichHtml | None
    question_ids: list[str]


class QuestionSetSummary(_Wire):
    id: uuid.UUID
    title: str
    kind: QuestionSetKind
    mode: QuestionSetMode
    question_count: int
    status: QuestionSetStatus


# ---------- submissions ----------


class ChoiceResponse(_Wire):
    kind: Literal["choice"]
    option_ids: list[str]


class PoolAssignResponse(_Wire):
    kind: Literal["pool-assign"]
    option_id: str | None


class TextResponse(_Wire):
    kind: Literal["text"]
    text: str = Field(max_length=2_000)


class JudgeResponse(_Wire):
    kind: Literal["judge"]
    value: bool | None


class EssayResponse(_Wire):
    kind: Literal["essay"]
    text: str = Field(max_length=20_000)


SlotResponse = Annotated[
    ChoiceResponse | PoolAssignResponse | TextResponse | JudgeResponse | EssayResponse,
    Field(discriminator="kind"),
]


class SlotResponseEntry(_Wire):
    slot_id: str
    response: SlotResponse | None


class AttemptSubmission(_Wire):
    question_id: str
    content_version: str
    responses: list[SlotResponseEntry] = Field(max_length=200)
    client_submitted_at: datetime | None = None


class SubmissionsIn(_Wire):
    submissions: list[AttemptSubmission] = Field(min_length=1, max_length=100)


# ---------- review & results ----------


class OptionsAnswer(_Wire):
    kind: Literal["options"]
    option_ids: list[str]


class ExactAnswer(_Wire):
    kind: Literal["exact"]
    accepted: list[str]
    display: RichHtml


class JudgeAnswer(_Wire):
    kind: Literal["judge"]
    value: bool | None


class RichAnswer(_Wire):
    kind: Literal["rich"]
    content: RichHtml


class MissingAnswer(_Wire):
    kind: Literal["missing"]


ReferenceAnswer = Annotated[
    OptionsAnswer | ExactAnswer | JudgeAnswer | RichAnswer | MissingAnswer,
    Field(discriminator="kind"),
]


class ReferenceAnswerEntry(_Wire):
    slot_id: str
    answer: ReferenceAnswer


class QuestionScope(_Wire):
    kind: Literal["question"]


class SubQuestionScope(_Wire):
    kind: Literal["sub-question"]
    sub_question_id: str


class SlotScope(_Wire):
    kind: Literal["slot"]
    slot_id: str


class UnknownScope(_Wire):
    kind: Literal["unknown"]


ExplanationScope = Annotated[
    QuestionScope | SubQuestionScope | SlotScope | UnknownScope,
    Field(discriminator="kind"),
]


class ExplanationSegment(_Wire):
    name: str
    content: RichHtml
    scope: ExplanationScope


class QuestionReview(_Wire):
    question_id: str
    content_version: str
    reference_answers: list[ReferenceAnswerEntry]
    answer_fallback: RichHtml | None
    explanation: list[ExplanationSegment]
    media: list[MediaAsset]


SlotVerdict = Literal["correct", "incorrect", "partial", "pending", "not-graded", "unanswered"]


class Score(_Wire):
    earned: int
    total: int


class Feedback(_Wire):
    format: Literal["html", "markdown"]
    text: str


class SlotResult(_Wire):
    slot_id: str
    verdict: SlotVerdict
    response: SlotResponse | None
    score: Score | None
    feedback: Feedback | None = None


class AttemptResult(_Wire):
    attempt_id: uuid.UUID
    question_id: str
    status: Literal["graded", "partially-graded", "pending", "ungradable"]
    score: Score | None
    slots: list[SlotResult]
    review: QuestionReview | None
    submitted_at: datetime | None = None
    attempt_session_id: uuid.UUID | None = None


class OpenAttempt(_Wire):
    attempt_session_id: uuid.UUID
    results: list[AttemptResult]


class QuestionSetView(_Wire):
    id: uuid.UUID
    title: str
    kind: QuestionSetKind
    mode: QuestionSetMode
    status: QuestionSetStatus
    sections: list[QuestionSetSection]
    questions: list[QuestionView]
    open_attempt: OpenAttempt | None = None


# ---------- developer entry (admin only) ----------


class QuestionSetBuildIn(_Wire):
    """Build a set straight from XKW query conditions (developer entry)."""

    xkw_course_id: int = Field(ge=0)
    kpoint_ids: list[int] = Field(default_factory=list, max_length=10)
    catalog_ids: list[int] = Field(default_factory=list, max_length=10)
    type_ids: list[str] = Field(default_factory=list, max_length=10)
    difficulty_levels: list[Literal[17, 18, 19, 20, 21]] = Field(default_factory=list, max_length=5)
    count: int = Field(default=5, ge=1, le=10)
    kind: QuestionSetKind = "quiz"
    mode: QuestionSetMode = "batch"
    title: str | None = Field(default=None, max_length=120)


class CatalogOut(_Wire):
    """Cached XKW basic data. `syncing` means the cache was empty and a
    background fetch was enqueued: poll again shortly."""

    status: Literal["ready", "syncing"]
    items: list[dict]
    fetched_at: datetime | None = None
