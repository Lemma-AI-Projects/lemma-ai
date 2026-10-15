"""轨迹（Trajectory）的接口：**只读**。

挂 `/projects/{project_id}/trajectory` —— 和 `/projects/{id}/goals` 同一个理由：
轨迹属于**空间**（它讲的是"这个空间发生过什么"），不属于人。

⚠️ 这里没有任何写入、没有触发、没有"生成"动作。轨迹不是被算出来的，
是**读出来的**：图上每一行都对应某张表里的一行。所以也就没有 202/后台任务，
也没有"重新分析"这种东西 —— 空间变了，下一次 GET 自然不一样。
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user
from schemas.trajectory import TrajectoryEventOut, TrajectoryOut, TrajectorySpanOut
from services import project_service, trajectory_service

router = APIRouter(prefix="/projects", tags=["trajectory"])

_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="project_not_found"
)


@router.get("/{project_id}/trajectory", response_model=TrajectoryOut)
async def get_trajectory(
    project_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TrajectoryOut:
    """这个空间真实发生过的事，从早到晚。

    ⚠️ **空空间返回 200 + 空数组**，不是 404 —— "还没发生什么"是一个正常状态
    （刚建的空间就是这样），把它做成错误会让客户端把正常状态当异常处理。
    空间不属于当前用户，才返回 404。
    """
    project = await project_service.get_owned_project(
        db, user_id=current_user.id, project_id=project_id
    )
    if project is None:
        raise _NOT_FOUND

    trajectory = await trajectory_service.assemble(
        db, user_id=current_user.id, project_id=project_id
    )
    from_at, to_at = trajectory.span
    return TrajectoryOut(
        space_id=project_id,
        span=TrajectorySpanOut(from_at=from_at, to_at=to_at),
        events=[
            TrajectoryEventOut(
                id=event.id,
                kind=event.kind,
                at=event.at,
                at_accuracy=event.at_accuracy,
                title=event.title,
                source=event.source,
                href=event.href,
            )
            for event in trajectory.events
        ],
        unattributed=trajectory.unattributed,
        truncated=trajectory.truncated,
    )
