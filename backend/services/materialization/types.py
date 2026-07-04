"""Boundary types for the per-chapter content materialization steps (决策⑧).

A "step" is one content artifact a chapter must produce during the materialization
phase (overview is the first; quiz / assignment / unit overview are future steps).
The video substrate (download -> Gemini upload) is NOT a step — it is ensured
inline by the chapter.materialize task and handed to every step as a ready
`VideoInput`. Adding a step ≈ writing a ChapterContentStep + registering it; the
chord orchestration骨架 never changes. No framework types leak through here.
"""

import uuid
from dataclasses import dataclass
from typing import Literal, Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from ai import VideoInput

StepStatus = Literal["ready", "pending", "failed"]


@dataclass
class StepContext:
    """Everything a step needs for one chapter (resolved by the orchestrator)."""

    course_id: uuid.UUID
    user_id: uuid.UUID
    chapter_id: uuid.UUID
    candidate_id: uuid.UUID
    # Chapter video duration (from the ready asset row) — drives the long-video
    # media-resolution downgrade (ai/video_limits). None = unknown, keep default.
    video_duration_s: int | None = None


@dataclass
class StepResult:
    status: Literal["ready", "failed"]
    error_type: str | None = None


class ChapterContentStep(Protocol):
    """A registrable content artifact for a chapter. `ensure` is idempotent (it
    short-circuits when already done) and must NEVER raise — it reports failure
    via StepResult so the chapter task can swallow + record a terminal status."""

    name: str

    async def status(
        self, db: AsyncSession, *, chapter_id: uuid.UUID, candidate_id: uuid.UUID
    ) -> StepStatus: ...

    async def ensure(self, ctx: StepContext, video: VideoInput) -> StepResult: ...
