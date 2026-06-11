import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user
from models.ai_conversation import AiConversation
from schemas.conversation import (
    ConversationMessageOut,
    ConversationOut,
    ConversationRenameIn,
)
from services import conversation_service

router = APIRouter(prefix="/conversations", tags=["conversations"])

_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="conversation_not_found"
)


async def _owned_or_404(
    db: AsyncSession, user: CurrentUser, conversation_id: uuid.UUID
) -> AiConversation:
    conversation = await conversation_service.get_owned_conversation(
        db, user_id=user.id, conversation_id=conversation_id
    )
    if conversation is None:
        raise _NOT_FOUND
    return conversation


@router.get("", response_model=list[ConversationOut])
async def list_conversations(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AiConversation]:
    return await conversation_service.list_conversations(
        db, user_id=current_user.id, limit=limit, offset=offset
    )


@router.get("/{conversation_id}/messages", response_model=list[ConversationMessageOut])
async def list_messages(
    conversation_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list:
    conversation = await _owned_or_404(db, current_user, conversation_id)
    return await conversation_service.list_messages(
        db, conversation_id=conversation.id
    )


@router.patch("/{conversation_id}", response_model=ConversationOut)
async def rename_conversation(
    conversation_id: uuid.UUID,
    payload: ConversationRenameIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AiConversation:
    conversation = await _owned_or_404(db, current_user, conversation_id)
    return await conversation_service.rename_conversation(
        db, conversation, title=payload.title
    )


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    conversation = await _owned_or_404(db, current_user, conversation_id)
    await conversation_service.delete_conversation(db, conversation)
