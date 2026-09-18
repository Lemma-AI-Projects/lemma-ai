"""Course-generation brain: pure AI logic (no DB, no Celery, no SDKs).

The services call these and persist the products. The boundary types are
re-exported eagerly (safe). The pipeline functions live in submodules that
import ai.client; since ai.agents imports ai.coursegen.types (running this
__init__), importing those submodules here would cycle
(client -> agents -> coursegen -> client). So they load lazily on first access
via PEP 562 __getattr__ — callers still write `from ai.coursegen import
stream_compose_course`.
"""

import importlib
from typing import TYPE_CHECKING, Any

from ai.coursegen.types import (
    ComposedCourse,
    ComposedCourseResult,
    Questionnaire,
    QuestionnaireQuestion,
    SearchQueries,
)

if TYPE_CHECKING:  # import-time names for type checkers, no runtime cycle
    from ai.coursegen.compose import compose_course, stream_compose_course
    from ai.coursegen.intake import generate_questionnaire
    from ai.coursegen.ranking import rank
    from ai.coursegen.topic_search import search_topic

_LAZY_EXPORTS = {
    "search_topic": "ai.coursegen.topic_search",
    "compose_course": "ai.coursegen.compose",
    "stream_compose_course": "ai.coursegen.compose",
    "generate_questionnaire": "ai.coursegen.intake",
    "rank": "ai.coursegen.ranking",
}

__all__ = [
    "ComposedCourse",
    "ComposedCourseResult",
    "Questionnaire",
    "QuestionnaireQuestion",
    "SearchQueries",
    "compose_course",
    "generate_questionnaire",
    "rank",
    "search_topic",
    "stream_compose_course",
]


def __getattr__(name: str) -> Any:
    module_path = _LAZY_EXPORTS.get(name)
    if module_path is None:
        raise AttributeError(f"module 'ai.coursegen' has no attribute '{name}'")
    return getattr(importlib.import_module(module_path), name)
