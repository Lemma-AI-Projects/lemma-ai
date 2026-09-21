"""The `$space_context` prompt variable: what the Global Agent can see.

Pure formatter over plain data — no ORM objects, no database, no model — so it
is unit-testable on its own and the same inputs always produce the same prompt.
It lives in ai/prompts/ because the text below is prompt wording, and prompt
wording belongs to the prompt layer (rules 第八章: no hardcoded prompts in
business code); the service that fetches the rows only supplies the data.

Two things it says and one it refuses to say:

- It lists the space's sources (titles, kinds, sizes) — the table of contents.
- It includes BOUNDED excerpts of the sources, because "read the space's
  material" cannot be left to whether the model decides to call a tool: the
  whole point of this agent is that it knows the space. The budget is explicit
  and inspectable (`EXCERPT_TOTAL_CHARS`), and every excerpt is labelled as an
  excerpt.
- It does NOT include the other conversations' contents. Their titles are
  listed so the user can be told they exist; reading them is a memory feature
  this version does not have, and pretending otherwise would be the exact
  hallucination the discipline lines exist to prevent.
"""

from dataclasses import dataclass

# The source list is capped so a space with 200 boards still yields a usable
# prompt; the remainder is reported as a count.
LIST_CAP = 20

# Excerpt budget. ~6k characters is roughly 2-3k tokens of Chinese text: enough
# for a handful of notes to be genuinely used, small enough to ride along on
# every turn. Per-source cap keeps one long PDF from crowding out the rest.
EXCERPT_TOTAL_CHARS = 6000
EXCERPT_PER_SOURCE_CHARS = 2400

KIND_LABELS: dict[str, str] = {
    "note": "note",
    "canvas": "canvas",
    "imported": "imported material",
    "folder": "folder",
}


@dataclass(frozen=True)
class SpaceSourceRef:
    """One source (board) as the agent sees it in the list."""

    id: str
    title: str
    kind: str
    chars: int
    excerpted: bool = False


@dataclass(frozen=True)
class SpaceExcerptRef:
    """A bounded slice of one source's text, already truncated if needed."""

    source_id: str
    title: str
    text: str
    truncated: bool = False


@dataclass(frozen=True)
class SpaceConversationRef:
    """Another conversation in the same space — title only, never contents."""

    id: str
    title: str
    message_count: int = 0


def _size(chars: int) -> str:
    if chars >= 1000:
        return f"{chars / 1000:.1f}k chars"
    return f"{chars} chars"


def render_space_context(
    *,
    space_name: str,
    sources: list[SpaceSourceRef],
    excerpts: list[SpaceExcerptRef],
    conversations: list[SpaceConversationRef],
    history_messages: int = 0,
) -> str:
    """The Global Agent's context block for one turn.

    Returns "" only when there is nothing to say at all (no space). An EMPTY
    space still produces a block that says so: silence would be read as
    "unknown", while "this space holds nothing yet" is a fact the agent can
    act on (e.g. offer to write the first note).
    """
    head = (
        "You are the Global Agent of this Learn Space.\n"
        f"The space is «{space_name}»."
    )

    sections: list[str] = [head, "", "Space context:"]

    if not sources:
        sections.append("- (empty) This space holds no material yet.")
    else:
        sections.append(f"- Sources ({len(sources)}):")
        for index, source in enumerate(sources[:LIST_CAP], start=1):
            marks = []
            if source.excerpted:
                marks.append("excerpt given below")
            sections.append(
                f"  {index}. «{source.title}» — "
                f"{KIND_LABELS.get(source.kind, source.kind)}, {_size(source.chars)}"
                + (f" ({', '.join(marks)})" if marks else "")
            )
        if len(sources) > LIST_CAP:
            sections.append(f"  …and {len(sources) - LIST_CAP} more not listed.")

    if excerpts:
        sections.extend(
            [
                "",
                f"- Excerpts from the sources above (bounded: at most "
                f"{EXCERPT_TOTAL_CHARS} characters in total):",
            ]
        )
        for excerpt in excerpts:
            suffix = " [truncated]" if excerpt.truncated else ""
            sections.extend(
                ["", f"### {excerpt.title}{suffix}", excerpt.text.strip()]
            )

    if conversations:
        sections.extend(
            [
                "",
                "- Other conversations in this space (TITLES ONLY — you cannot "
                "read their contents):",
            ]
        )
        for conversation in conversations[:LIST_CAP]:
            sections.append(
                f"  - «{conversation.title}» ({conversation.message_count} messages)"
            )

    sections.extend(
        [
            "",
            "Rules:",
            "- The sources and excerpts above ARE this space's material. When the "
            "user asks about the space, answer from them; this is what makes you "
            "different from a general chatbot.",
            "- An excerpt may be truncated. If the user needs a whole source, call "
            "read_page with its title — do not guess the missing part.",
            "- Refer to a source by its title EXACTLY as written above: do not "
            "translate or rename it. The user sees those exact titles in the "
            "space, and a renamed source is one they cannot find.",
            "- Conversations are listed by title only. If the user asks what was "
            "said in one, say you cannot read other conversations.",
            "- If something is not in the material above, say you do not have it. "
            "Never invent sources, file names or contents.",
            f"- This turn replays {history_messages} earlier message(s) of THIS "
            "conversation as chat history.",
            "- You may add a NEW source with save_note when the user asks you to "
            "remember something. You cannot modify sources the user made.",
        ]
    )
    return "\n".join(sections)
