"""learner — five-layer learner state system (first-class core module).

P0 milestone: identity / knowledge / patterns / episodes / meta-rules +
spaced-repetition review queue, with static + dynamic + tool injection
channels wired into the agent loop.

Design decisions (see planning/memory-engine-planning/DECISIONS.md):
  D1  first-class core module, not a MemoryProvider plugin
  D3  standalone ~/.hermes/learner.db (SQLite WAL)
  D4  pure stdlib
  D5  enabled by default (learner.enabled=true)
  D6  one tool ``learner_state`` with an action enum
  D8  static tier uses a dedicated <learner-state> tag
  D9  learning_episodes carries a ``concept`` column
"""

from agent.learner.learner_core import LearnerCore
from agent.learner.learner_injector import (
    LEARNER_STATE_SCHEMA,
    handle_learner_tool,
    inject_tools,
)

__all__ = [
    "LearnerCore",
    "LEARNER_STATE_SCHEMA",
    "handle_learner_tool",
    "inject_tools",
]
