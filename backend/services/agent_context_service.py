"""What the Global Agent can see for one Learn Space — assembled once per turn.

One home for the question "what is in this space": the chat turn uses it to fill
the prompt AND records its digest on the answer, the Context Inspector endpoint
uses it to show the same thing on screen. Two consumers, one computation — the
inspector therefore cannot drift from what the agent actually got.

Four parts, and they are different kinds of thing:

  - sources + excerpts — the space's MATERIAL (Space Context proper);
  - conversations — a title-only list of what else is here;
  - memories — what this space DECIDED in conversations that already ended.
    The only part that survives the conversation it came from;
  - learner state — what the evidence says this learner can already do, and
    what that makes ready to learn next. NOT stored here and NOT computed here:
    it is derived from `knowledge_evidence` by ai/knowledge/state.py, and this
    module only decides how it reaches the prompt. The agent reads it; it never
    writes it (the one write path is the `record_evidence` tool).

How the digest reports memory has to be read carefully, and it is split for
that reason: `memories` is the set handed to the model THIS turn (frozen when
the turn starts, exactly like the prompt), while `memoriesWritten` is what the
turn produced. They are disjoint by construction — a memory written now cannot
have been in its own prompt.

Deliberately NOT here: Learner State, ranking, embeddings, retrieval. Memory
arrives as "the most recent N, verbatim" and nothing more (see
planning/space-memory-v0-execution-plan.md §7 for what V0 refuses to build).
"""

import logging
import uuid
from dataclasses import dataclass, field

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.prompts.space_context import (
    EXCERPT_PER_SOURCE_CHARS,
    EXCERPT_TOTAL_CHARS,
    MEMORY_LIST_CAP,
    SpaceConversationRef,
    SpaceExcerptRef,
    SpaceMemoryRef,
    SpacePreferenceRef,
    SpaceSourceRef,
    render_space_context,
)
from ai.prompts.user_home import render_preference_stack, render_user_home
from models.ai_conversation import AiConversation, AiMessage
from models.doc import Block, Page
from models.project import Project
from services import (
    knowledge_service,
    space_memory_service,
    space_preference_service,
    user_home_service,
)

logger = logging.getLogger(__name__)

# Caps that keep one turn's context bounded and explainable.
SOURCE_LIST_CAP = 20
CONVERSATION_LIST_CAP = 10

_UNTITLED = "(untitled)"


@dataclass
class AgentContext:
    """The assembled view. `digest` is small (persisted per answer), `inspector`
    carries the full prompt text (never persisted)."""

    space_id: uuid.UUID
    space_name: str
    sources: list[SpaceSourceRef] = field(default_factory=list)
    excerpts: list[SpaceExcerptRef] = field(default_factory=list)
    # All of the space's conversations (the inspector shows them, marking the
    # current one) …
    conversations: list[SpaceConversationRef] = field(default_factory=list)
    # … and the ones actually NAMED in the prompt, which excludes the current
    # conversation (its content arrives as chat history instead). The digest
    # reports this list, so the panel never claims a title-only listing of a
    # conversation whose messages the model did in fact see.
    prompt_conversations: list[SpaceConversationRef] = field(default_factory=list)
    # This space's memories, newest first, capped at MEMORY_LIST_CAP. §3.3 of the
    # execution plan: these went INTO the prompt for this turn.
    memories: list[SpaceMemoryRef] = field(default_factory=list)
    # The space's real total, which can exceed the list above — the prompt says
    # "…and N older memory item(s) not shown", and N has to be true.
    memory_total: int = 0
    # The derived Learner State block (see ai/knowledge/state.py). Empty when the
    # space has no knowledge structure, in which case the appended section says
    # so rather than disappearing — an empty prompt would read as "unknown".
    learner_state_block: str = ""
    # Outer-fringe titles as they stood when the turn started: what the agent was
    # told is ready to learn. Titles, not counts — the digest carries no mastery
    # number anywhere.
    learner_ready: list[str] = field(default_factory=list)
    history_messages: int = 0
    # The learner's Home — the only GLOBAL layer in this turn. Read on every turn
    # in every space, so "the agent knows the same person in Space A and Space B"
    # is a property of the assembly rather than of the caller. Empty when the
    # learner has not filled anything in.
    home_block: str = ""
    home_summary: dict = field(default_factory=dict)
    # This space's standing preferences (the middle layer).
    space_preferences: list[SpacePreferenceRef] = field(default_factory=list)
    # The concrete stacking of conversation > space > Home for THIS turn. Only
    # the layers that are actually set appear; a single layer produces no stack,
    # because nothing can conflict with it.
    preference_layers: list[dict] = field(default_factory=list)
    prompt_block: str = ""

    @property
    def prompt_chars(self) -> int:
        return len(self.prompt_block)

    @property
    def excerpt_chars(self) -> int:
        return sum(len(excerpt.text) for excerpt in self.excerpts)

    def digest(self, *, action: str = "answer") -> dict:
        """Wire-shaped (camelCase) summary — what the Agent Context panel shows.

        Small on purpose: this lands on every assistant message. The prompt text
        is excluded (kilobytes per row, and recomputable for display).
        """
        return {
            "space": {"id": str(self.space_id), "name": self.space_name},
            "sources": [
                {
                    "id": source.id,
                    "title": source.title,
                    "kind": source.kind,
                    "chars": source.chars,
                    "excerpted": source.excerpted,
                }
                for source in self.sources
            ],
            "conversations": [
                {"id": conversation.id, "title": conversation.title}
                for conversation in self.prompt_conversations
            ],
            "memories": [
                {
                    "id": memory.id,
                    "text": memory.text,
                    "fromConversation": memory.from_conversation or None,
                }
                for memory in self.memories
            ],
            "memoriesTotal": self.memory_total,
            # Filled at the END of the turn (it is what the turn produced, so it
            # cannot be known here) — always present so the panel can tell
            # "nothing was written" from "this build predates the field".
            "memoriesWritten": [],
            # What the agent was told about this learner THIS turn (frozen with
            # the prompt, like everything else here). `ready` is the outer
            # fringe — the answer to "what should I learn next" is derivable
            # from it, which is the entire point of the KST route.
            "learnerState": {
                "included": bool(self.learner_state_block),
                "ready": list(self.learner_ready),
            },
            # Home is GLOBAL: it is the same in every space, so the panel can
            # show it next to the space block and the difference is visible.
            "home": self.home_summary,
            "spacePreferences": [
                {"id": preference.id, "text": preference.text}
                for preference in self.space_preferences
            ],
            # Most specific first. Order IS the rule (conversation > space >
            # home); the panel prints them in this order for the same reason the
            # prompt does.
            "preferenceLayers": list(self.preference_layers),
            "historyMessages": self.history_messages,
            "promptChars": self.prompt_chars,
            "excerptChars": self.excerpt_chars,
            "action": action,
        }

    def inspector(self) -> dict:
        """The Context Inspector payload: the digest plus what the panel cannot
        infer — the literal prompt block and every excerpt in full."""
        payload = self.digest()
        payload["promptBlock"] = self.prompt_block
        payload["excerpts"] = [
            {
                "sourceId": excerpt.source_id,
                "title": excerpt.title,
                "chars": len(excerpt.text),
                "truncated": excerpt.truncated,
                "text": excerpt.text,
            }
            for excerpt in self.excerpts
        ]
        payload["budget"] = {
            "excerptTotalChars": EXCERPT_TOTAL_CHARS,
            "excerptPerSourceChars": EXCERPT_PER_SOURCE_CHARS,
            "sourceListCap": SOURCE_LIST_CAP,
        }
        return payload


async def _space(db: AsyncSession, *, user_id: uuid.UUID, project_id: uuid.UUID):
    """(id, name) for an owned space; None follows the IDOR rule (404 upstream)."""
    result = await db.execute(
        select(Project.id, Project.name).where(
            Project.id == project_id, Project.user_id == user_id
        )
    )
    return result.one_or_none()


async def _sources_with_stats(
    db: AsyncSession, *, project_id: uuid.UUID
) -> list[tuple[Page, int]]:
    """(page, character count) for every source, newest first.

    The count is the length of the block texts, not the JSON: it is what the
    user would call the size of a note, and it is what the prompt budget spends.
    """
    pages = (
        await db.execute(
            select(Page)
            .where(Page.project_id == project_id)
            .order_by(Page.updated_at.desc())
        )
    ).scalars().all()
    if not pages:
        return []

    stats = dict(
        (
            await db.execute(
                select(
                    Block.page_id,
                    func.coalesce(
                        func.sum(
                            func.length(
                                # ->> (astext): jsonb -> text, so length() and the
                                # coalesce default agree on a type. A plain ->
                                # yields jsonb and Postgres refuses the COALESCE.
                                func.coalesce(Block.content["text"].astext, "")
                            )
                        ),
                        0,
                    ),
                )
                .where(Block.page_id.in_([page.id for page in pages]))
                .group_by(Block.page_id)
            )
        ).all()
    )
    return [(page, int(stats.get(page.id, 0))) for page in pages]


async def _excerpts_for(
    db: AsyncSession, pages: list[Page]
) -> list[SpaceExcerptRef]:
    """Bounded excerpts, newest sources first, stopping when the budget is out.

    Ordering is by the same recency the list uses: what the user touched last is
    the best guess at what the conversation is about, and it makes the budget
    deterministic (same space → same prompt).
    """
    excerpts: list[SpaceExcerptRef] = []
    spent = 0
    for page in pages:
        if spent >= EXCERPT_TOTAL_CHARS:
            break
        blocks = (
            await db.execute(
                select(Block).where(Block.page_id == page.id).order_by(Block.position)
            )
        ).scalars().all()
        text = _blocks_to_text(blocks).strip()
        if not text:
            continue
        remaining = min(EXCERPT_TOTAL_CHARS - spent, EXCERPT_PER_SOURCE_CHARS)
        truncated = len(text) > remaining
        excerpts.append(
            SpaceExcerptRef(
                source_id=str(page.id),
                title=page.title,
                text=text[:remaining],
                truncated=truncated,
            )
        )
        spent += min(len(text), remaining)
    return excerpts


def _blocks_to_text(blocks) -> str:
    """Flatten stored blocks to Markdown (same shapes doc_service writes).

    A local copy rather than importing doc_service: this module must not depend
    on the doc layer's write side, and the mapping is six lines of pure data.
    """
    out: list[str] = []
    for block in blocks:
        content = block.content or {}
        if block.type == "heading":
            level = max(1, min(6, int(content.get("level") or 1)))
            out.append(f"{'#' * level} {content.get('text', '')}")
        elif block.type == "list":
            items = content.get("items") or []
            for index, item in enumerate(items, start=1):
                out.append(
                    f"{index}. {item}" if content.get("ordered") else f"- {item}"
                )
        elif block.type == "code":
            out.append(f"```{content.get('language') or ''}\n{content.get('text', '')}\n```")
        elif block.type == "quote":
            out.append(f"> {content.get('text', '')}")
        elif block.type == "divider":
            out.append("---")
        else:
            out.append(str(content.get("text", "")))
    return "\n\n".join(part for part in out if part.strip())


async def _conversations(
    db: AsyncSession, *, user_id: uuid.UUID, project_id: uuid.UUID, limit: int
) -> list[SpaceConversationRef]:
    rows = (
        await db.execute(
            select(AiConversation)
            .where(
                AiConversation.project_id == project_id,
                AiConversation.user_id == user_id,
            )
            .order_by(AiConversation.updated_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    if not rows:
        return []
    counts = dict(
        (
            await db.execute(
                select(AiMessage.conversation_id, func.count())
                .where(AiMessage.conversation_id.in_([row.id for row in rows]))
                .group_by(AiMessage.conversation_id)
            )
        ).all()
    )
    return [
        SpaceConversationRef(
            id=str(row.id),
            title=row.title or _UNTITLED,
            message_count=int(counts.get(row.id, 0)),
        )
        for row in rows
    ]


async def _learner_state_block(
    db: AsyncSession, *, user_id: uuid.UUID, project_id: uuid.UUID
) -> tuple[str, list[str]]:
    """The derived Learner State for this turn, or ("", []) if it is unavailable.

    Best-effort like the rest of the assembly, and for the same reason: a chat
    turn must not fail because a side channel is missing. Two legitimate ways it
    comes back empty — the space has no knowledge structure (the block then says
    exactly that, which is itself information), or the knowledge tables do not
    exist yet in this database. Neither may be reported as "this learner knows
    nothing": an empty string appended to the prompt adds no claim at all.
    """
    try:
        return await knowledge_service.state_for_prompt(
            db, project_id=project_id, user_id=user_id
        )
    except Exception:  # noqa: BLE001 — a missing side channel must not break chat
        logger.warning(
            "learner state unavailable (project=%s)", project_id, exc_info=True
        )
        return "", []


async def build_agent_context(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    current_conversation_id: uuid.UUID | None = None,
    history_messages: int = 0,
) -> AgentContext | None:
    """Everything the Global Agent will see for one turn, or None if the space
    is not the caller's (the API layer turns that into a 404)."""
    space = await _space(db, user_id=user_id, project_id=project_id)
    if space is None:
        return None

    pages_with_stats = await _sources_with_stats(db, project_id=project_id)
    # Only the sources that fit the excerpt budget are actually read.
    excerpt_pages: list[Page] = []
    spent = 0
    for page, chars in pages_with_stats:
        if spent >= EXCERPT_TOTAL_CHARS:
            break
        excerpt_pages.append(page)
        spent += min(chars, EXCERPT_PER_SOURCE_CHARS)
    excerpts = await _excerpts_for(db, excerpt_pages)
    excerpted_ids = {excerpt.source_id for excerpt in excerpts}

    sources = [
        SpaceSourceRef(
            id=str(page.id),
            title=page.title,
            kind=page.kind,
            chars=chars,
            excerpted=str(page.id) in excerpted_ids,
        )
        for page, chars in pages_with_stats
    ]

    all_conversations = await _conversations(
        db,
        user_id=user_id,
        project_id=project_id,
        limit=CONVERSATION_LIST_CAP + 1,
    )
    # The current conversation is replayed as chat history, so listing it again
    # would double-count it; the prompt gets the others only.
    prompt_conversations = [
        conversation
        for conversation in all_conversations
        if conversation.id != str(current_conversation_id)
    ][:CONVERSATION_LIST_CAP]

    # Space Memory: the only part of this block that outlives a conversation.
    # Read even when the space has sources — the two answer different questions.
    memory_rows = await space_memory_service.list_for_space(
        db, user_id=user_id, project_id=project_id, limit=MEMORY_LIST_CAP
    )
    memories = [
        SpaceMemoryRef(
            id=str(memory.id),
            text=memory.text,
            from_conversation=title,
            created_at=memory.created_at.isoformat() if memory.created_at else "",
        )
        for memory, title in (memory_rows or [])
    ]
    memory_total = await space_memory_service.count_for_space(
        db, user_id=user_id, project_id=project_id
    )

    # Home is read HERE, on every turn, in every space — that is the whole
    # mechanism behind "the agent knows the same person in Space A and Space B".
    # It goes FIRST in the block below because it is the least specific layer in
    # it, and the prompt states that order rather than leaving it to be guessed.
    home = await user_home_service.read_user_home(db, user_id=user_id)
    home_block = render_user_home(home)
    home_summary = {
        # `global: True` is not decoration: the panel shows Home and the space
        # side by side, and the reader has to know which one follows the learner.
        "global": True,
        "language": home.language,
        "background": home.background,
        "interests": home.interests,
        "preferences": home.preferences,
        # A COUNT, not the texts: a candidate is a question for the user, and
        # quoting it here would let the model answer it on their behalf.
        "candidates": len(home.candidates),
    }

    preference_rows = await space_preference_service.list_for_space(
        db, user_id=user_id, project_id=project_id
    )
    space_preferences = [
        SpacePreferenceRef(id=str(row.id), text=row.text) for row in preference_rows
    ]

    space_block = render_space_context(
        space_name=space.name,
        sources=sources,
        excerpts=excerpts,
        conversations=prompt_conversations,
        memories=memories,
        memory_total=memory_total,
        preferences=space_preferences,
        history_messages=history_messages,
    )
    learner_block, learner_ready = await _learner_state_block(
        db, user_id=user_id, project_id=project_id
    )

    # conversation > space > Home, most specific first. The conversation's own
    # layer is `ai_conversations.method` — the only conversation-scoped
    # preference the product stores. A one-off request ("explain THIS in
    # detail") needs no row of its own: it is already the last thing in the chat
    # history, and the block below spells out which layer wins so the model does
    # not have to guess. Nothing here writes anything, which is what makes
    # "a conversation can override Home but never edit it" structural.
    layers = user_home_service.preference_layers(
        home=home.preferences,
        space=[row.text for row in preference_rows],
        conversation=await user_home_service.conversation_note(
            db, conversation_id=current_conversation_id
        ),
    )
    preference_block = render_preference_stack(layers)

    # One variable, one block: the model receives ONE context, and the Context
    # Inspector's promise is that `promptBlock` is the literal text it got —
    # splitting learner state into a second prompt variable would make the
    # inspector partial. The split lives in the digest instead, for humans.
    prompt_block = "\n\n".join(
        part
        for part in (home_block, space_block, learner_block, preference_block)
        if part
    )
    return AgentContext(
        space_id=space.id,
        space_name=space.name,
        sources=sources,
        excerpts=excerpts,
        conversations=all_conversations,
        prompt_conversations=prompt_conversations,
        memories=memories,
        memory_total=memory_total,
        learner_state_block=learner_block,
        learner_ready=learner_ready,
        history_messages=history_messages,
        home_block=home_block,
        home_summary=home_summary,
        space_preferences=space_preferences,
        preference_layers=[
            {"scope": layer.scope, "text": layer.text} for layer in layers
        ],
        prompt_block=prompt_block,
    )


def summarise_digest(
    digest: dict,
    *,
    action: str,
    memories_written: list[dict] | None = None,
    method: dict | None = None,
) -> dict:
    """Re-stamp the things only the END of a turn can know.

    `action` and `memories_written` are both unknowable when the digest is
    captured (the tool card may arrive mid-stream; a memory write happens during
    it), while the rest of the digest must be frozen at the start to describe
    the same moment as the prompt. Re-stamping rather than rebuilding keeps one
    source of truth for every other field.

    `method` (Method V0) is pushed in by the chat service because the method
    layer sits above this module — the alternative would be a service cycle, and
    the field is a plain dict by the time it arrives.
    """
    return {
        **digest,
        "action": action,
        "memoriesWritten": list(memories_written or []),
        "method": method,
    }
