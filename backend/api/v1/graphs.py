"""Desmos graph endpoints: card hydrate + user-edit persistence.

The card is a thin reference (tool_json carries only graphId); this GET is the
single hydrate path for both live rendering and history reload. PATCH stores
the opaque calculator state alongside a readable expression snapshot — the
snapshot is what the read_current_graph tool later feeds back to the model.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user
from schemas.desmos import DesmosGraphOut, DesmosGraphPatchIn
from services import desmos_graph_service

router = APIRouter(prefix="/graphs", tags=["graphs"])

_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="graph_not_found"
)


@router.get("/{graph_id}", response_model=DesmosGraphOut)
async def get_graph(
    graph_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DesmosGraphOut:
    graph = await desmos_graph_service.get_owned_graph(
        db, user_id=current_user.id, graph_id=graph_id
    )
    if graph is None:
        # Foreign and nonexistent graphs are indistinguishable (IDOR red line).
        raise _NOT_FOUND
    return DesmosGraphOut.model_validate(graph)


@router.patch("/{graph_id}", response_model=DesmosGraphOut)
async def patch_graph(
    graph_id: uuid.UUID,
    payload: DesmosGraphPatchIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DesmosGraphOut:
    graph = await desmos_graph_service.get_owned_graph(
        db, user_id=current_user.id, graph_id=graph_id
    )
    if graph is None:
        raise _NOT_FOUND
    graph = await desmos_graph_service.update_user_edit(
        db, graph, state=payload.state, expressions=payload.expressions
    )
    return DesmosGraphOut.model_validate(graph)
