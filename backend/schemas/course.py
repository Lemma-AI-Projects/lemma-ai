"""API contracts for the course domain (rules 第十章). Wire format is camelCase.

The snapshot tree mirrors the frontend ConversationToolBlock
(features/conversation/types.ts):

    { id, title, status, progress,
      units: [{ id, title, status, progress,
                chapters: [{ id, title, status, progress }] }] }

status/progress are carried straight from the DB. Mapping DB lifecycle states
(intake/building/ready/... , not_started/researching/...) to the frontend's
display states is business behavior left to a later phase; here the contract
only fixes the shape. order_index is deliberately omitted — ordering is applied
when the rows are read, the wire never exposes it.
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


# --- 课程树快照（对齐前端 ConversationToolBlock）---


class CourseChapterOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    title: str
    status: str
    progress: int = 0


class CourseUnitOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    title: str
    status: str
    # Unit/course progress has no DB column yet (only chapters track it);
    # defaults to 0 until rollup is computed in a later phase.
    progress: int = 0
    chapters: list[CourseChapterOut] = Field(default_factory=list)


class CourseOutlineOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    title: str
    status: str
    progress: int = 0
    units: list[CourseUnitOut] = Field(default_factory=list)


class CourseDetailOut(CourseOutlineOut):
    """Full course snapshot. Same tree shape as the outline today; kept as its
    own type so the detail and outline endpoints can diverge later without
    breaking either contract."""

    # True once the intake questionnaire has been generated and stored. The
    # in-conversation card polls this snapshot while it's still generating, then
    # fetches the questionnaire exactly once it flips true (or shows failure if
    # the course moved to `failed`).
    questionnaire_ready: bool = False


class CourseListItemOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    title: str
    status: str
    updated_at: datetime


class BuildProgressEvent(BaseModel):
    """SSE payload for 阶段二 build progress.

    定法: DB is the single source of truth; every ~1s tick ships the whole
    course snapshot (no diff), so a reconnect is just GET-snapshot then resume.
    """

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    course: CourseDetailOut


# --- 章节视频交付（播放）---


class VideoSourceOut(BaseModel):
    """The original third-party video this chapter re-hosts (chin "来源" button)."""

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


class ChapterVideoOut(BaseModel):
    """Playable chapter video + provenance.

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
