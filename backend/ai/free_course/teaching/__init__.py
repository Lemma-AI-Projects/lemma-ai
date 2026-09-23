"""Teaching runtime for one Free-Course chapter.

Scoped on purpose: this package exists to reproduce the *behaviour* of one
Hyperknow Deep Learning Session inside a Free Course chapter, and nothing else.
It is not a new lesson format, not a scheduler, and not a second curriculum —
the chapter's own lesson objects are its only input.

    plan_session()  chapter -> TeachingSessionPlan   (once, when the session opens)
    respond_to()    learner signal -> TeachingTurn   (every later turn)

The board/timeline vocabulary lives in types.py; the bounds live in planner.py.

Types are re-exported eagerly (they are plain pydantic models, safe to import
from anywhere); the two functions are NOT, because planner.py imports
ai.client — and ai.client imports ai.agents, which imports this package for its
output types. An eager import here would close that cycle. Same reason
ai/free_course/__init__.py defers its own pipeline exports.
"""

import importlib
from typing import Any

from ai.free_course.teaching.types import (
    BOARD_HEIGHT,
    BOARD_WIDTH,
    MAX_ACTIONS_PER_STEP,
    MAX_STEPS_PER_PLAN,
    BoardAction,
    BoardPoint,
    SessionSignal,
    SessionStepRef,
    TeachingQuestion,
    TeachingSessionPlan,
    TeachingStep,
    TeachingTurn,
)

_LAZY_EXPORTS = {
    "plan_session": "ai.free_course.teaching.planner",
    "respond_to": "ai.free_course.teaching.planner",
    "split_sentences": "ai.free_course.teaching.planner",
}

__all__ = [
    "BOARD_HEIGHT",
    "BOARD_WIDTH",
    "MAX_ACTIONS_PER_STEP",
    "MAX_STEPS_PER_PLAN",
    "BoardAction",
    "BoardPoint",
    "SessionSignal",
    "SessionStepRef",
    "TeachingQuestion",
    "TeachingSessionPlan",
    "TeachingStep",
    "TeachingTurn",
    "plan_session",
    "respond_to",
    "split_sentences",
]


def __getattr__(name: str) -> Any:
    module_path = _LAZY_EXPORTS.get(name)
    if module_path is None:
        raise AttributeError(f"module 'ai.free_course.teaching' has no attribute '{name}'")
    return getattr(importlib.import_module(module_path), name)
