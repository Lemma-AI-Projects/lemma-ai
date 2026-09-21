"""The text→blocks parser and the prompt block: both pure, both testable here.

Everything the importer and the Agent's save_note produce goes through
`markdown_to_blocks`, and everything the Agent reads back through
`blocks_to_text`. A silent drop in either direction is the failure this file
exists to catch — the round trip is asserted as a property, not as examples.

No database, no storage, no model.
"""

from dataclasses import dataclass

from services.doc_service import blocks_to_text, markdown_to_blocks


@dataclass
class FakeBlock:
    """Blocks_to_text only reads `type` and `content` — no ORM needed."""

    type: str
    content: dict


def flatten(markdown: str) -> str:
    return blocks_to_text(
        [FakeBlock(block["type"], block["content"]) for block in markdown_to_blocks(markdown)]
    )


def types_of(markdown: str) -> list[str]:
    return [block["type"] for block in markdown_to_blocks(markdown)]


def test_each_shape_maps_to_its_own_block_type():
    markdown = (
        "# Title\n\n"
        "A paragraph line.\n\n"
        "## Section\n\n"
        "- one\n- two\n\n"
        "1. first\n2. second\n\n"
        "```python\nprint(1)\n```\n\n"
        "> quoted\n\n"
        "---\n"
    )
    assert types_of(markdown) == [
        "heading",
        "paragraph",
        "heading",
        "list",
        "list",
        "code",
        "quote",
        "divider",
    ]


def test_heading_level_is_kept():
    blocks = markdown_to_blocks("### Third level\n")
    assert blocks[0]["content"] == {"level": 3, "text": "Third level"}


def test_ordered_and_unordered_runs_do_not_merge():
    """A numbered list under a bulleted one is two blocks, not one.

    Merging them would relabel every numbered item as a bullet — the kind of
    quiet corruption that only shows up when someone reads the board back.
    """
    blocks = markdown_to_blocks("- bullet\n1. first\n")
    assert [block["content"] for block in blocks] == [
        {"ordered": False, "items": ["bullet"]},
        {"ordered": True, "items": ["first"]},
    ]


def test_fence_at_end_of_file_is_not_swallowed():
    """An unclosed fence still yields its body (imports are often truncated)."""
    blocks = markdown_to_blocks("```\nno closing fence\n")
    assert blocks == [{"type": "code", "content": {"language": "", "text": "no closing fence"}}]


def test_unrecognised_lines_survive_as_a_paragraph():
    blocks = markdown_to_blocks("| a | b |\n|---|---|\n")
    assert blocks[0]["type"] == "paragraph"
    assert "| a | b |" in blocks[0]["content"]["text"]


def test_round_trip_keeps_every_visible_line():
    markdown = (
        "# Title\n\n"
        "Intro text.\n\n"
        "- alpha\n- beta\n\n"
        "```js\nconst a = 1;\n```\n\n"
        "> note\n"
    )
    restored = flatten(markdown)
    for fragment in ("# Title", "Intro text.", "- alpha", "const a = 1;", "> note"):
        assert fragment in restored


def test_blank_input_produces_nothing():
    assert markdown_to_blocks("") == []
    assert markdown_to_blocks("\n\n  \n") == []
