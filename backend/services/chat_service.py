"""Chat business logic: conversation state + persistence around AIClient.

Split into two steps because the conversation id must be known BEFORE the
SSE response starts (it travels in the X-Conversation-Id header):

    prepare_turn()  -> create-or-load the conversation, rebuild history
    stream_turn()   -> run the AI turn, forward chunks, persist the pair

Persistence rule (拍板 2026-06-11): the user+assistant pair is written once
the first token has been emitted — partial answers from a stop/error are kept
(the user saw them, the tokens are paid for). If the turn fails before any
output, nothing is written and a retry starts clean.
"""

import asyncio
import contextlib
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from ai import AIChunk, AIUseCase, ChatMessage, ai_client
from core.security import CurrentUser
from schemas.ai import ChatRequest
from services import conversation_service


@dataclass
class TurnContext:
    conversation_id: uuid.UUID
    user_id: uuid.UUID
    user_content: str
    user_sent_at: datetime
    history: list[ChatMessage]
    # Set for a NEW conversation: the row doesn't exist yet (its id is
    # pre-generated); persist_turn creates it together with the first turn.
    new_conversation_title: str | None = None


async def prepare_turn(
    db: AsyncSession, payload: ChatRequest, user: CurrentUser
) -> TurnContext | None:
    """Resolve the conversation for this turn before streaming starts.

    A new conversation is NOT written here — only its id is generated, so a
    turn that dies before the first token leaves no empty conversation behind.
    Returns None when the requested conversation doesn't belong to the caller
    (the API layer answers 404 — indistinguishable from "doesn't exist").
    """
    content = payload.user_content
    if payload.conversation_id is None:
        return TurnContext(
            conversation_id=uuid.uuid4(),
            user_id=user.id,
            user_content=content,
            user_sent_at=datetime.now(UTC),
            history=[],
            new_conversation_title=conversation_service.title_from_first_message(
                content
            ),
        )

    conversation = await conversation_service.get_owned_conversation(
        db, user_id=user.id, conversation_id=payload.conversation_id
    )
    if conversation is None:
        return None
    rows = await conversation_service.load_recent_history(
        db, conversation_id=conversation.id
    )
    return TurnContext(
        conversation_id=conversation.id,
        user_id=user.id,
        user_content=content,
        user_sent_at=datetime.now(UTC),
        history=[ChatMessage(role=row.role, content=row.content_text) for row in rows],
    )


async def stream_turn(context: TurnContext) -> AsyncIterator[AIChunk]:
    """Run one AI turn and persist the message pair on the way out.

    The finally block also runs on client disconnect (CancelledError /
    GeneratorExit), which is exactly when the partial answer must be saved —
    the write is shielded so cancellation can't kill it mid-flight.
    """
    parts: list[str] = []
    raw_parts: dict[str, Any] | None = None
    chunk_stream = ai_client.stream_chat(
        AIUseCase.TEXT_CHAT,
        [*context.history, ChatMessage(role="user", content=context.user_content)],
        user_id=str(context.user_id),
        conversation_id=str(context.conversation_id),
    )
    try:
        async for chunk in chunk_stream:
            if chunk.kind == "delta" and chunk.text:
                parts.append(chunk.text)
            elif chunk.kind == "done":
                raw_parts = chunk.raw_parts
            yield chunk
    finally:
        # Close the inner generator deterministically (books the interrupted
        # ledger row right now, instead of whenever GC finalizes it).
        with contextlib.suppress(Exception):
            await chunk_stream.aclose()
        assistant_text = "".join(parts)
        if assistant_text:
            await _persist_pair_protected(context, assistant_text, raw_parts)


async def _persist_pair_protected(
    context: TurnContext, assistant_text: str, raw_parts: dict[str, Any] | None
) -> None:
    """Persist the turn even while being cancelled.

    asyncio.shield keeps the write running when the surrounding task is
    cancelled, but the await itself still raises CancelledError — so we
    re-await the task to guarantee the transaction finished before teardown
    continues. persist_turn never raises (it logs), so the bare await is safe.
    """
    task = asyncio.create_task(
        conversation_service.persist_turn(
            conversation_id=context.conversation_id,
            user_id=context.user_id,
            new_conversation_title=context.new_conversation_title,
            user_content=context.user_content,
            user_sent_at=context.user_sent_at,
            assistant_content=assistant_text,
            raw_parts=raw_parts,
        )
    )
    try:
        await asyncio.shield(task)
    except asyncio.CancelledError:
        await task
        raise
