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
from services import conversation_service, project_service

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
        db,
        user_id=current_user.id,
        name=payload.name,
        agent=payload.agent.model_dump() if payload.agent else None,
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
