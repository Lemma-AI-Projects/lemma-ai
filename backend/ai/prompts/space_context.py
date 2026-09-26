"""The `$space_context` prompt variable: what the Global Agent can see.

Pure formatter over plain data — no ORM objects, no database, no model — so it
is unit-testable on its own and the same inputs always produce the same prompt.
It lives in ai/prompts/ because the text below is prompt wording, and prompt
wording belongs to the prompt layer (rules 第八章: no hardcoded prompts in
business code); the service that fetches the rows only supplies the data.

It says three things and refuses a fourth:

- It lists the space's sources (titles, kinds, sizes) — the table of contents.
- It includes BOUNDED excerpts of the sources, because "read the space's
  material" cannot be left to whether the model decides to call a tool: the
  whole point of this agent is that it knows the space. The budget is explicit
  and inspectable (`EXCERPT_TOTAL_CHARS`), and every excerpt is labelled as an
  excerpt.
- It includes this space's MEMORIES (`SpaceMemoryRef`): what the two of you
  decided in conversations that have already ended. This is the only part of
  the block that carries across conversations.
- It does NOT include the other conversations' CONTENTS. Their titles are
  listed so the user can be told they exist; reading them is a retrieval
  feature this version does not have, and pretending otherwise would be the
  exact hallucination the discipline lines exist to prevent.
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

# Memory budget. V0 retrieval is "the most recent N, verbatim" — there is no
# ranking and no semantic search (see the execution plan §7), so the cap is the
# whole relevance policy. 20 is comfortably more than a demo space holds and
# small enough that the block stays a paragraph, not a dossier; each memory is a
# sentence or two, and the per-item cap only bites on a runaway write.
MEMORY_LIST_CAP = 20
MEMORY_ITEM_CHARS = 400

# Space preferences are one-liners and there are rarely more than a few; past
# this the list has stopped being a setting and become a rules document.
PREFERENCE_LIST_CAP = 10

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


@dataclass(frozen=True)
class SpaceMemoryRef:
    """One thing this space remembers from an earlier conversation.

    `from_conversation` is a title for the human reading the panel; the model
    gets it so it can say where a memory came from. A memory whose source
    conversation was deleted keeps an empty title — the memory outlives the chat
    that produced it (that is why the FK is SET NULL, not CASCADE).
    """

    id: str
    text: str
    from_conversation: str = ""
    created_at: str = ""


@dataclass(frozen=True)
class SpacePreferenceRef:
    """One standing preference of this space, as the agent sees it.

    Deliberately separate from Space Memory: a memory is something that HAPPENED
    here, a preference is how the user wants to be taught HERE. It is the middle
    layer of conversation > space > Home, and the only layer that may contradict
    Home without changing it.
    """

    id: str
    text: str
    created_at: str = ""


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
    memories: list[SpaceMemoryRef] | None = None,
    memory_total: int = 0,
    preferences: list[SpacePreferenceRef] | None = None,
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

    if memories:
        sections.extend(
            [
                "",
                "- Space memory — things decided in EARLIER conversations of this "
                "space (newest first). These are the user's own decisions, not "
                "your inferences:",
            ]
        )
        for memory in memories[:MEMORY_LIST_CAP]:
            text = memory.text.strip()
            if len(text) > MEMORY_ITEM_CHARS:
                text = text[:MEMORY_ITEM_CHARS] + "…"
            origin = (
                f" (from «{memory.from_conversation}»)"
                if memory.from_conversation
                else ""
            )
            sections.append(f"  - {text}{origin}")
        hidden = memory_total - min(len(memories), MEMORY_LIST_CAP)
        if hidden > 0:
            sections.append(
                f"  …and {hidden} older memory item(s) not shown here."
            )

    if preferences:
        sections.extend(
            [
                "",
                "- This space's standing preferences — how the user wants to be "
                "taught HERE. They outrank their Home (which is global) and are "
                "outranked by what they ask for in this turn:",
            ]
        )
        for preference in preferences[:PREFERENCE_LIST_CAP]:
            text = preference.text.strip()
            if len(text) > MEMORY_ITEM_CHARS:
                text = text[:MEMORY_ITEM_CHARS] + "…"
            sections.append(f"  - {text}")

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
            "- Space memory is what this space decided in earlier conversations. "
            "Use it when it bears on the request (continuing a plan, a reason "
            "behind an earlier choice); when it does not, do not force it into "
            "the answer and do not recite the list unprompted.",
            "- A learner's Home is GLOBAL and this space's preferences are LOCAL. "
            "If they disagree, follow the space here (and the current turn above "
            "both) — but never rewrite Home to match a space or a single turn. "
            "Nothing you can call writes Home without the user confirming it.",
            "- When the user makes a decision, sets a plan, states a preference, "
            "or asks you to remember something, call remember FIRST (one or two "
            "sentences that still make sense out of context), then answer. Say "
            "back what you recorded so the user can see it.",
            "- If something is not in the material above, say you do not have it. "
            "Never invent sources, file names or contents.",
            f"- This turn replays {history_messages} earlier message(s) of THIS "
            "conversation as chat history.",
            "- save_note adds a SOURCE (material the space holds, e.g. a study "
            "note); remember adds a MEMORY (a decision or preference, no "
            "material). Pick by what the user wants to find later: a document "
            "they would read, or a conclusion they would act on. save_note can "
            "only create — you cannot modify sources the user made.",
        ]
    )
    return "\n".join(sections)
