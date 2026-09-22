"""Space Memory guards that must not depend on a database.

Two things worth pinning here, both about the shape rather than the storage:

  * "there is no space" must be a no-op, not a query against a NULL project id.
    `_owned_project_id` returning None *before* touching the session is what
    makes that true — so it is asserted by calling it with no session at all.
  * the prompt block. What the model is told about memory is the feature: which
    memories reach it, where they came from, and the fact that the block says
    nothing at all when the space has none (silence must not become a heading
    with an empty list under it).
"""

from __future__ import annotations

import asyncio

from ai.prompts.space_context import (
    MEMORY_ITEM_CHARS,
    MEMORY_LIST_CAP,
    SpaceMemoryRef,
    render_space_context,
)
from services.space_memory_service import TEXT_MAX_CHARS, _owned_project_id

# The section's own opening words — the rules paragraph also says "Space
# memory", so assertions must key on this, not on the phrase.
SECTION = "- Space memory — things decided in EARLIER conversations"

DECISION = "期末复习先重点解决 Eigenvector proof，暂时不急着学 diagonalization。"


def prompt(memories=None, *, total=None):
    return render_space_context(
        space_name="AI for Math",
        sources=[],
        excerpts=[],
        conversations=[],
        memories=memories or [],
        memory_total=total if total is not None else len(memories or []),
        history_messages=0,
    )


def test_no_project_means_no_query():
    # db=None on purpose: if this ever starts querying first, it will raise
    # AttributeError instead of returning None, and this test goes red.
    assert asyncio.run(_owned_project_id(None, user_id=None, project_id=None)) is None


def test_memory_text_has_a_ceiling():
    # A sentence or two. The cap guards the prompt, which replays every memory
    # on every future turn — an essay here costs every turn from then on.
    assert 200 <= TEXT_MAX_CHARS <= 2000


# --- the prompt block --------------------------------------------------------


def test_a_space_without_memories_says_nothing_about_them():
    # Not an empty list under a heading: silence, so the model cannot report
    # "your memory is empty" as if it had checked.
    assert SECTION not in prompt()


def test_a_memory_reaches_the_prompt_with_its_origin():
    block = prompt([SpaceMemoryRef("m1", DECISION, "昨天的复习")])
    assert SECTION in block
    assert DECISION in block
    # Provenance is part of the value: it lets the agent say where an earlier
    # decision came from instead of asserting it out of nowhere.
    assert "«昨天的复习»" in block


def test_hidden_memories_are_counted_not_silently_dropped():
    memories = [SpaceMemoryRef(f"m{i}", f"第 {i} 条") for i in range(MEMORY_LIST_CAP)]
    block = prompt(memories, total=MEMORY_LIST_CAP + 4)
    # The cap is the whole retrieval policy in V0, so what it hides has to be
    # stated — otherwise a space that grew looks smaller than it is.
    assert "4 older memory item(s) not shown here" in block


def test_a_runaway_memory_is_truncated_in_the_block():
    block = prompt([SpaceMemoryRef("m1", "长" * (MEMORY_ITEM_CHARS + 50))])
    assert "…" in block
    assert "长" * (MEMORY_ITEM_CHARS + 50) not in block


def test_the_write_discipline_is_part_of_the_block():
    block = prompt()
    # The tool exists but the model has to know WHEN to reach for it, and that
    # it must say back what it recorded. Both are prompt-level contracts.
    assert "call remember FIRST" in block
    assert "Say back what you recorded" in block
    # And the one distinction that is easy to get wrong: a note is material,
    # a memory is a conclusion.
    assert "save_note adds a SOURCE" in block
