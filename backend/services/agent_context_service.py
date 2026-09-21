"""What the Global Agent can see for one Learn Space — assembled once per turn.

One home for the question "what is in this space": the chat turn uses it to fill
the prompt AND records its digest on the answer, the Context Inspector endpoint
uses it to show the same thing on screen. Two consumers, one computation — the
inspector therefore cannot drift from what the agent actually got.

Deliberately NOT here: Learner State, Space Memory, ranking, embeddings,
retrieval. This version hands the model a bounded, honest view of the space and
nothing else (see the execution plan: V0 stops before any of that).
"""

import uuid
from dataclasses import dataclass, field

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.prompts.space_context import (
    EXCERPT_PER_SOURCE_CHARS,
    EXCERPT_TOTAL_CHARS,
    SpaceConversationRef,
    SpaceExcerptRef,
    SpaceSourceRef,
    render_space_context,
)
from models.ai_conversation import AiConversation, AiMessage
from models.doc import Block, Page
from models.project import Project

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
    conversations: list[SpaceConversationRef] = field(default_factory=list)
    history_messages: int = 0
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
                for conversation in self.conversations
            ],
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

    prompt_block = render_space_context(
        space_name=space.name,
        sources=sources,
        excerpts=excerpts,
        conversations=prompt_conversations,
        history_messages=history_messages,
    )
    return AgentContext(
        space_id=space.id,
        space_name=space.name,
        sources=sources,
        excerpts=excerpts,
        conversations=all_conversations,
        history_messages=history_messages,
        prompt_block=prompt_block,
    )


def summarise_digest(digest: dict, *, action: str) -> dict:
    """Re-stamp the action on a digest captured before the turn finished.

    The action can only be known at the end (a tool card may arrive mid-stream),
    while the digest is captured at the start — so it is corrected here rather
    than rebuilt, keeping one source of truth for the rest of the fields.
    """
    return {**digest, "action": action}
