"""Conversation persistence and ownership rules.

Hard rule (IDOR red line): every query that touches a conversation by id MUST
filter by user_id as well. Callers never get to see whether a foreign
conversation exists — "not yours" and "not there" are both None -> 404.
"""

import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal, engine
from models.ai_conversation import AiConversation, AiMessage

logger = logging.getLogger(__name__)

# Context window for rebuilding history server-side: enough for coherent
# multi-turn chat without letting old conversations inflate token spend
# forever. Becomes a setting if a real need to tune it appears.
HISTORY_MESSAGE_LIMIT = 40

TITLE_MAX_CHARS = 50


def title_from_first_message(content: str) -> str:
    title = " ".join(content.strip().split())
    return title[:TITLE_MAX_CHARS] or "New chat"


async def get_owned_conversation(
    db: AsyncSession, *, user_id: uuid.UUID, conversation_id: uuid.UUID
) -> AiConversation | None:
    result = await db.execute(
        select(AiConversation).where(
            AiConversation.id == conversation_id,
            AiConversation.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def list_conversations(
    db: AsyncSession, *, user_id: uuid.UUID, limit: int = 50, offset: int = 0
) -> list[AiConversation]:
    """Main sidebar list: unfiled conversations only (拍板 2026-06-13).

    Conversations moved into a project live in the project page instead —
    ChatGPT-style information architecture, no double listing.
    """
    result = await db.execute(
        select(AiConversation)
        .where(
            AiConversation.user_id == user_id,
            AiConversation.project_id.is_(None),
        )
        .order_by(AiConversation.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars())


async def list_project_conversations(
    db: AsyncSession, *, project_id: uuid.UUID, limit: int = 50, offset: int = 0
) -> list[tuple[AiConversation, str | None]]:
    """Project chat list with previews: (conversation, last user message).

    Ownership of the project is checked by the caller. The preview is the
    last USER message (the question reads better than a markdown answer);
    correlated subquery rides the (conversation_id, created_at) index.
    """
    last_user_message = (
        select(AiMessage.content_text)
        .where(
            AiMessage.conversation_id == AiConversation.id,
            AiMessage.role == "user",
        )
        .order_by(AiMessage.created_at.desc())
        .limit(1)
        .scalar_subquery()
    )
    result = await db.execute(
        select(AiConversation, last_user_message)
        .where(AiConversation.project_id == project_id)
        .order_by(AiConversation.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return [(row[0], row[1]) for row in result.all()]


async def set_conversation_project(
    db: AsyncSession, conversation: AiConversation, *, project_id: uuid.UUID | None
) -> AiConversation:
    """Move a conversation into a project (or out, with None).

    Target project ownership is validated by the caller (api layer) — this
    function only flips the link.
    """
    conversation.project_id = project_id
    await db.commit()
    await db.refresh(conversation)
    return conversation


async def list_messages(
    db: AsyncSession, *, conversation_id: uuid.UUID
) -> list[AiMessage]:
    """Full message history, chronological. Ownership is checked by the caller
    via get_owned_conversation before this runs."""
    result = await db.execute(
        select(AiMessage)
        .where(AiMessage.conversation_id == conversation_id)
        .order_by(AiMessage.created_at.asc())
    )
    return list(result.scalars())


async def load_recent_history(
    db: AsyncSession, *, conversation_id: uuid.UUID
) -> list[AiMessage]:
    """Last N messages in chronological order (the model's context window)."""
    result = await db.execute(
        select(AiMessage)
        .where(AiMessage.conversation_id == conversation_id)
        .order_by(AiMessage.created_at.desc())
        .limit(HISTORY_MESSAGE_LIMIT)
    )
    return list(reversed(result.scalars().all()))


async def rename_conversation(
    db: AsyncSession, conversation: AiConversation, *, title: str
) -> AiConversation:
    conversation.title = title
    await db.commit()
    await db.refresh(conversation)
    return conversation


async def delete_conversation(
    db: AsyncSession, conversation: AiConversation
) -> None:
    # Hard delete by design; ai_messages rows go with it (FK CASCADE).
    await db.delete(conversation)
    await db.commit()


# One statement per case: the user is WAITING on this write (`done` is held
# back until the pair is durable), and the dev topology talks to a far-away
# Postgres — so transaction ceremony (BEGIN/.../COMMIT roundtrips) is real
# user-visible latency. A single data-modifying-CTE statement under
# autocommit is still fully atomic (one statement = one implicit
# transaction; FK checks run at end of statement) but costs ONE roundtrip.
_PERSIST_TURN_NEW_CONVERSATION = text(
    """
    WITH conv AS (
        INSERT INTO ai_conversations
            (id, user_id, title, project_id, created_at, updated_at)
        VALUES (:conversation_id, :user_id, :title, :project_id, now(), now())
    )
    INSERT INTO ai_messages
        (id, conversation_id, role, content_text, raw_parts_json, tool_json,
         created_at)
    VALUES
        (:user_msg_id, :conversation_id, 'user', :user_content,
         NULL, NULL, :user_sent_at),
        (:assistant_msg_id, :conversation_id, 'assistant', :assistant_content,
         CAST(:raw_parts AS jsonb), CAST(:tool_json AS jsonb), :assistant_at)
    """
)

_PERSIST_TURN_EXISTING_CONVERSATION = text(
    """
    WITH msgs AS (
        INSERT INTO ai_messages
            (id, conversation_id, role, content_text, raw_parts_json, tool_json,
             created_at)
        VALUES
            (:user_msg_id, :conversation_id, 'user', :user_content,
             NULL, NULL, :user_sent_at),
            (:assistant_msg_id, :conversation_id, 'assistant', :assistant_content,
             CAST(:raw_parts AS jsonb), CAST(:tool_json AS jsonb), :assistant_at)
    )
    UPDATE ai_conversations SET updated_at = now()
    WHERE id = :conversation_id
    """
)


async def persist_turn(
    *,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    new_conversation_title: str | None,
    new_conversation_project_id: uuid.UUID | None = None,
    user_content: str,
    user_sent_at: datetime,
    assistant_content: str,
    raw_parts: dict[str, Any] | None,
    tool_ref: dict[str, Any] | None = None,
) -> None:
    """Write one finished turn (user + assistant) atomically, in one roundtrip.

    For a NEW conversation (new_conversation_title set) the conversation row
    itself lands in the same statement: a conversation only exists once it
    has messages. Its id was pre-generated and already announced in the
    X-Conversation-Id header — until this write that id resolves to 404, and
    if the turn dies before the first token the id simply never materializes
    (no empty conversations in the sidebar).

    Uses its OWN connection: this may run while the request that spawned it
    is already being torn down. Explicit timestamps keep ordering
    deterministic (user message = request arrival, assistant = completion).

    Never raises — losing one turn beats crashing teardown; failures go to
    the log with the conversation id for manual recovery.
    """
    params: dict[str, Any] = {
        "conversation_id": conversation_id,
        "user_msg_id": uuid.uuid4(),
        "assistant_msg_id": uuid.uuid4(),
        "user_content": user_content,
        "user_sent_at": user_sent_at,
        "assistant_content": assistant_content,
        "assistant_at": datetime.now(UTC),
        "raw_parts": json.dumps(raw_parts) if raw_parts is not None else None,
        "tool_json": json.dumps(tool_ref) if tool_ref is not None else None,
    }
    if new_conversation_title is not None:
        statement = _PERSIST_TURN_NEW_CONVERSATION
        params |= {
            "user_id": user_id,
            "title": new_conversation_title,
            "project_id": new_conversation_project_id,
        }
    else:
        statement = _PERSIST_TURN_EXISTING_CONVERSATION
    try:
        async with engine.connect() as connection:
            autocommit = await connection.execution_options(
                isolation_level="AUTOCOMMIT"
            )
            await autocommit.execute(statement, params)
    except Exception:  # noqa: BLE001 — teardown path must never crash the stream
        logger.exception(
            "failed to persist chat turn (conversation_id=%s)", conversation_id
        )
