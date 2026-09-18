"""Per-point content materialization steps (决策⑧).

Public surface: the step registry (CONTENT_STEPS) + boundary types. The video
substrate is ensured inline by the point.materialize task; steps only consume a
ready VideoInput.
"""

from services.materialization.registry import CONTENT_STEPS
from services.materialization.types import (
    PointContentStep,
    StepContext,
    StepResult,
    StepStatus,
)

__all__ = [
    "CONTENT_STEPS",
    "PointContentStep",
    "StepContext",
    "StepResult",
    "StepStatus",
]
