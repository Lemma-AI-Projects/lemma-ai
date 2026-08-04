"""learner_projection — bridge to built-in memory + external providers (P3, stub).

P3 adds:
  * bidirectional projection between learner.db and MEMORY.md/USER.md
  * interop with external memory providers via MemoryProvider.on_memory_write

Kept as an importable stub; no-op for P0.
"""

from __future__ import annotations


def sync_from_builtin(agent) -> None:
    """One-way seed of identity from USER.md into learner.db (P3)."""
    return None
