"""Chat business logic: turns API payloads into AIClient calls.

Phase 1 is stateless — the client sends the conversation history with each
request. Persistence (ai_conversation) arrives in Phase 2 and lands here.
"""

from collections.abc import AsyncIterator

from ai import AIUseCase, ChatMessage, ai_client
from core.security import CurrentUser
from schemas.ai import ChatRequest


def stream_chat(payload: ChatRequest, user: CurrentUser) -> AsyncIterator[str]:
    """Return the SSE event stream for one chat turn."""
    messages = [
        ChatMessage(role=message.role, content=message.content)
        for message in payload.messages
    ]
    return ai_client.stream_chat(
        AIUseCase.TEXT_CHAT, messages, user_id=str(user.id)
    )
