"""Per-chapter content materialization steps (决策⑧).

Public surface: the step registry (CONTENT_STEPS) + boundary types. The video
substrate is ensured inline by the chapter.materialize task; steps only consume a
ready VideoInput.
"""

from services.materialization.registry import CONTENT_STEPS
from services.materialization.types import (
    ChapterContentStep,
    StepContext,
    StepResult,
    StepStatus,
)

__all__ = [
    "CONTENT_STEPS",
    "ChapterContentStep",
    "StepContext",
    "StepResult",
    "StepStatus",
]
