import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user
from models.project import Project
from schemas.project import (
    ProjectConversationOut,
    ProjectCreateIn,
    ProjectOut,
    ProjectUpdateIn,
)
from services import agent_context_service, conversation_service, project_service

router = APIRouter(prefix="/projects", tags=["projects"])

_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="project_not_found"
)


async def _owned_or_404(
    db: AsyncSession, user: CurrentUser, project_id: uuid.UUID
) -> Project:
    project = await project_service.get_owned_project(
        db, user_id=user.id, project_id=project_id
    )
    if project is None:
        raise _NOT_FOUND
    return project


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreateIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Project:
    return await project_service.create_project(
        db, user_id=current_user.id, name=payload.name
    )


@router.get("", response_model=list[ProjectOut])
async def list_projects(
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Project]:
    return await project_service.list_projects(
        db, user_id=current_user.id, limit=limit, offset=offset
    )


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Project:
    return await _owned_or_404(db, current_user, project_id)


@router.get("/{project_id}/conversations", response_model=list[ProjectConversationOut])
async def list_project_conversations(
    project_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ProjectConversationOut]:
    project = await _owned_or_404(db, current_user, project_id)
    rows = await conversation_service.list_project_conversations(
        db, project_id=project.id, limit=limit, offset=offset
    )
    return [
        ProjectConversationOut(
            id=conversation.id,
            title=conversation.title,
            last_message=last_message,
            updated_at=conversation.updated_at,
        )
        for conversation, last_message in rows
    ]


@router.get("/{project_id}/agent-context")
async def get_agent_context(
    project_id: uuid.UUID,
    conversation_id: uuid.UUID | None = Query(default=None, alias="conversationId"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """What the Global Agent can see for this space — the Context Inspector.

    It calls the SAME assembly the chat turn uses, on purpose: a second
    implementation would eventually describe a context the agent never got, and
    the whole point of this endpoint is that the user can trust it. The payload
    includes the literal prompt block the agent will receive, so "it uses the
    space" is verifiable by eye rather than asserted.

    Recomputed live, so it describes the space NOW. What a past answer actually
    saw is recorded on that answer (ai_messages.agent_context_json) — the two
    are deliberately different questions.
    """
    history_messages = 0
    if conversation_id is not None:
        conversation = await conversation_service.get_owned_conversation(
            db, user_id=current_user.id, conversation_id=conversation_id
        )
        if conversation is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="conversation_not_found",
            )
        history_messages = len(
            await conversation_service.load_recent_history(
                db, conversation_id=conversation.id
            )
        )

    context = await agent_context_service.build_agent_context(
        db,
        user_id=current_user.id,
        project_id=project_id,
        current_conversation_id=conversation_id,
        history_messages=history_messages,
    )
    if context is None:
        raise _NOT_FOUND
    return context.inspector()


@router.patch("/{project_id}", response_model=ProjectOut)
async def rename_project(
    project_id: uuid.UUID,
    payload: ProjectUpdateIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Project:
    project = await _owned_or_404(db, current_user, project_id)
    return await project_service.rename_project(db, project, name=payload.name)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    project = await _owned_or_404(db, current_user, project_id)
    # Conversations inside fall back to the main list (FK SET NULL).
    await project_service.delete_project(db, project)
