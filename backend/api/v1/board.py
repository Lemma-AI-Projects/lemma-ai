"""Mala：投送包的写入与读回。

两个端点，因为 Mala 其余的部分全在前端（选择、拖拽、面板）—— 后端只需要
"把这次选择存住"和"把它读回来"。它**不解析画板、不调模型、不碰对象存储**，
理由见 `models/board_context.py` 开头那两条既有边界。

拒绝一律明确（`ContextRefused.reason` 直接进 detail），不做静默降级。
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user
from schemas.board_context import BoardContextIn, BoardContextOut
from services import board_context_service

router = APIRouter(prefix="/board", tags=["board"])


@router.post("/contexts", response_model=BoardContextOut, status_code=201)
async def create_board_context(
    payload: BoardContextIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BoardContextOut:
    """存下一次投送：他在画板上选中的那一组材料。

    存的是**快照**，不是活引用 —— 画板会变，而"当时给 Agent 的是什么"必须可复现。
    """
    try:
        row = await board_context_service.create_bundle(
            db, user_id=current_user.id, payload=payload
        )
    except board_context_service.ContextRefused as exc:
        raise HTTPException(status_code=exc.status, detail=exc.reason) from exc
    return board_context_service.to_out(row)


@router.get("/contexts/{bundle_id}", response_model=BoardContextOut)
async def read_board_context(
    bundle_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BoardContextOut:
    """读回一个包（前端的 chip 展开、回到出处都用它）。别人的 id 一律 404。"""
    row = await board_context_service.get_bundle(
        db, user_id=current_user.id, bundle_id=bundle_id
    )
    if row is None:
        raise HTTPException(status_code=404, detail="context_not_found")
    return board_context_service.to_out(row)
