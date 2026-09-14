"""Free-Course — 自由课程: a course generated from an intent alone.

Pure AI logic (no DB, no Celery, no SDKs), same boundary as ai/coursegen:
services/ calls these and persists the products.

Pipeline: intent -> map -> gap/path -> blueprint -> lesson, plus answer feedback.
Three seams are reserved, and only one implementation of each exists today:

- ``LearnerStateProvider`` (learner_state) — MVP: self-reported level + hints
- ``Source`` (sources) — MVP: learner input + model knowledge, no web retrieval
- generation strategy (blueprint + content) — MVP: one structured call each

Boundary types are re-exported eagerly; anything that imports ai.client is
resolved lazily, so importing a type from this package can never drag the client
(and the framework behind it) into an import cycle.
"""

import importlib
from typing import TYPE_CHECKING, Any

from ai.free_course.types import (
    AnswerFeedback,
    CourseProduct,
    GapItem,
    GapStatus,
    LearnerResponse,
    LearnerState,
    LearningGap,
    LearningIntent,
    LearningMap,
    LearningObject,
    LearningPath,
    LearningSession,
    Lesson,
    LessonBlueprint,
    MapLesson,
    MapUnit,
    ObjectPayload,
    Observation,
    PathStep,
    PracticeOption,
    Verdict,
)

if TYPE_CHECKING:  # names for type checkers without a runtime import
    from ai.free_course.blueprint import design_blueprint
    from ai.free_course.content import generate_lesson
    from ai.free_course.feedback import explain_answer
    from ai.free_course.intent import understand
    from ai.free_course.learner_state import (
        BasicLearnerStateProvider,
        LearnerStateProvider,
        NullLearnerStateProvider,
    )
    from ai.free_course.path import assess_gap, build_path
    from ai.free_course.pipeline import (
        FreeCourseEvent,
        FreeCoursePipeline,
        generate,
    )
    from ai.free_course.sources import (
        LearnerInputSource,
        ModelKnowledgeSource,
        Source,
        SourceMaterial,
        SourceRef,
        collect_sources,
        default_sources,
    )
    from ai.free_course.structure import structure

_LAZY_EXPORTS = {
    "understand": "ai.free_course.intent",
    "structure": "ai.free_course.structure",
    "assess_gap": "ai.free_course.path",
    "build_path": "ai.free_course.path",
    "design_blueprint": "ai.free_course.blueprint",
    "generate_lesson": "ai.free_course.content",
    "explain_answer": "ai.free_course.feedback",
    "FreeCourseEvent": "ai.free_course.pipeline",
    "FreeCoursePipeline": "ai.free_course.pipeline",
    "generate": "ai.free_course.pipeline",
    "LearnerStateProvider": "ai.free_course.learner_state",
    "BasicLearnerStateProvider": "ai.free_course.learner_state",
    "NullLearnerStateProvider": "ai.free_course.learner_state",
    "Source": "ai.free_course.sources",
    "SourceRef": "ai.free_course.sources",
    "SourceMaterial": "ai.free_course.sources",
    "LearnerInputSource": "ai.free_course.sources",
    "ModelKnowledgeSource": "ai.free_course.sources",
    "default_sources": "ai.free_course.sources",
    "collect_sources": "ai.free_course.sources",
}


def __getattr__(name: str) -> Any:
    module_path = _LAZY_EXPORTS.get(name)
    if module_path is None:
        raise AttributeError(f"module 'ai.free_course' has no attribute '{name}'")
    return getattr(importlib.import_module(module_path), name)
