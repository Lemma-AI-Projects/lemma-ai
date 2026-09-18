"""API contracts for the course domain (rules 第十章). Wire format is camelCase.

The course tree has four levels — course → module（章）→ lesson（单元）→
point（学习点）— and a point is exactly one video:

    { id, title, description, coverUrl, status, questionnaireReady,
      modules: [{ id, title, summary,
                  lessons: [{ id, title, summary,
                              points: [{ id, title, buildStatus,
                                         completed, lastPositionSeconds }] }] }] }

`status` (course) and `buildStatus` (point) describe the GENERATION pipeline,
not the learner's progress: a freshly delivered course has every point at
`ready` and nothing learned. Learning progress rides on the separate
`completed` / `lastPositionSeconds` fields (services/progress_service.py) — a
progress ring must be driven from those and never from the pipeline fields.

order_index is deliberately omitted — ordering is applied when the rows are
read, the wire never exposes it.
"""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

# --- 阶段一：问卷与答案 ---


class QuestionnaireQuestionOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    # AI-generated string id (e.g. "calculus-level"), not a DB UUID.
    id: str
    title: str
    options: list[str]


class QuestionnaireOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    questions: list[QuestionnaireQuestionOut]


class IntakeAnswerIn(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    question_id: str
    # The chosen option text (single-select, matching the current frontend
    # questionnaire). Unanswered questions are simply omitted from the list.
    answer: str


class IntakeAnswersIn(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    answers: list[IntakeAnswerIn] = Field(min_length=1)


# --- 课程树快照（course → module → lesson → point）---


class CoursePointOut(BaseModel):
    """A learning point: the leaf, bound to exactly one video."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    title: str
    # Generation pipeline state, NOT learning progress.
    build_status: str
    # Learning progress, merged in per-caller (the ORM row knows nothing about
    # who is reading). Defaults cover the organize SSE, where the course is
    # still being built and nothing can have been learned yet.
    completed: bool = False
    last_position_seconds: int = 0


class CourseLessonOut(BaseModel):
    """A lesson（单元）: a few learning points plus a short summary."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    title: str
    # A few sentences, written by compose. Null on rows produced before the
    # field existed or when the model omitted it.
    summary: str | None = None
    points: list[CoursePointOut] = Field(default_factory=list)


class CourseModuleOut(BaseModel):
    """A module（章）: the top grouping layer. Pure structure, no state."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    title: str
    summary: str | None = None
    lessons: list[CourseLessonOut] = Field(default_factory=list)


class CourseDetailOut(BaseModel):
    """Full course snapshot — the dashboard's read contract.

    Also the payload of the organize stream's `materializing` and `done`
    frames (see OrganizeSnapshot below), so one shape covers live progress,
    reconnect and the plain GET.
    """

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    title: str
    description: str | None = None
    # Display URL for the cover image. Not produced yet — the dashboard renders
    # a placeholder while it is null.
    cover_url: str | None = None
    status: str
    # True once the intake questionnaire has been generated and stored. The
    # in-conversation card polls this snapshot while it's still generating, then
    # fetches the questionnaire exactly once it flips true (or shows failure if
    # the course moved to `failed`).
    questionnaire_ready: bool = False
    modules: list[CourseModuleOut] = Field(default_factory=list)


# The organize SSE (`GET /courses/{id}/organize/stream`) carries this exact
# snapshot — flat, not wrapped — on both its `materializing` and `done` frames.
# Named here so the contract is discoverable from the schema module.
OrganizeSnapshot = CourseDetailOut


class CourseListItemOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    title: str
    description: str | None = None
    cover_url: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    # Learning progress as counts, not a percentage: the course card shows a
    # ring while the 进行中/已完成 filter needs "finished everything", and both
    # fall out of the same pair without the wire rounding anything away.
    completed_point_count: int = 0
    total_point_count: int = 0


# --- 学习进度上报 ---


class PointProgressIn(BaseModel):
    """Player heartbeat for one learning point.

    `durationSeconds` may be absent when the player has not resolved metadata
    yet; the completion ratio is then uncomputable and the point stays open.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    position_seconds: int = Field(ge=0)
    duration_seconds: int | None = Field(default=None, gt=0)


class PointProgressOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    completed: bool
    last_position_seconds: int


# --- 学习点视频交付（播放）---


class VideoSourceOut(BaseModel):
    """The original third-party video this point re-hosts (chin "来源" button)."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    platform: str  # 'youtube' | 'bilibili'
    title: str
    url: str


class VideoAuthorOut(BaseModel):
    """Original uploader (chin "作者" button). homepageUrl may be null when the
    platform exposes no stable channel link (e.g. YouTube search results) — the
    frontend hides the author affordance then."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str | None = None
    homepage_url: str | None = None


class PointVideoOut(BaseModel):
    """Playable learning-point video + provenance.

    status drives the player: `ready` carries a short-lived signed `playbackUrl`;
    `downloading` means the asset is being fetched (the client polls); `failed`
    means this attempt could not produce a playable file. source/author are known
    from the chosen candidate in every state, so the chin renders immediately.
    `expiresAt` is when `playbackUrl` stops working (re-fetch to re-mint).
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    status: Literal["ready", "downloading", "failed"]
    playback_url: str | None = None
    source: VideoSourceOut
    author: VideoAuthorOut
    expires_at: datetime | None = None
