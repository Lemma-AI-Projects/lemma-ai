"""Boundary types for the per-point content materialization steps (决策⑧).

A "step" is one content artifact a learning point must produce during the
materialization phase. The video substrate (download to Storage) is NOT a step
— it is ensured inline by the point.materialize task before any step runs, so a
step can assume the point has a playable video. A step that additionally needs
the model to WATCH the video drives services/point_gemini_prep itself; the
Gemini upload is deliberately not pre-warmed during materialization (a file
expires in ~48h, long before most learners arrive).

Adding a step ≈ writing a PointContentStep + registering it; the chord
orchestration骨架 never changes. No framework types leak here.

There are currently NO registered steps: the AI chapter overview was retired with
the four-level restructure, and quiz / practice generation does not exist yet.
"""

import uuid
from dataclasses import dataclass
from typing import Literal, Protocol

from sqlalchemy.ext.asyncio import AsyncSession

StepStatus = Literal["ready", "pending", "failed"]


@dataclass
class StepContext:
    """Everything a step needs for one point (resolved by the orchestrator)."""

    course_id: uuid.UUID
    user_id: uuid.UUID
    point_id: uuid.UUID
    candidate_id: uuid.UUID
    # Point video duration (from the ready asset row) — drives the long-video
    # media-resolution downgrade (ai/video_limits). None = unknown, keep default.
    video_duration_s: int | None = None


@dataclass
class StepResult:
    status: Literal["ready", "failed"]
    error_type: str | None = None


class PointContentStep(Protocol):
    """A registrable content artifact for a learning point. `ensure` is
    idempotent (it short-circuits when already done) and must NEVER raise — it
    reports failure via StepResult so the point task can swallow + record a
    terminal status."""

    name: str

    async def status(
        self, db: AsyncSession, *, point_id: uuid.UUID, candidate_id: uuid.UUID
    ) -> StepStatus: ...

    async def ensure(self, ctx: StepContext) -> StepResult: ...
