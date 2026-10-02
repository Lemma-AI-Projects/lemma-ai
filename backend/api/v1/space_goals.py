"""空间目标的接口：建立 / 回述 / 确认 / 修改 / 暂停 / 恢复 / 关闭。

挂在 `/projects/{project_id}/goals` 下面，和 `/projects/{id}/preferences` 同一个
理由：**目标属于空间，不属于人**。放在这里，`user_home` 那几条路由就永远写不到
一个空间的目标，反过来也一样 —— 两个拥有者，两条路。

三处刻意的写法：

  * **建立一个目标永远产出 `draft`。** 确认是另一个请求，不是这个请求的一部分。
    这不是流程繁琐：目标会驱动排序与终止，一个没被学习者点头的目标就是一次猜测，
    而让猜测去带方向是所有错误里最难解释的一种。
  * **没有 active 目标返回 `200` + `null`，不是 404。** "这个空间还没有目标"是一个
    正常状态（人们常常先攒资料，后来才想清楚要干什么），把它做成错误会让客户端
    把正常状态当异常处理。空间不是你的，才返回 404。
  * **抽取不写库。** 它读一句话，回答"我听到了什么"。写不写由学习者的那一次点击决定。
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user
from schemas.space_goal import (
    SpaceGoalCloseIn,
    SpaceGoalCreateIn,
    SpaceGoalExtractIn,
    SpaceGoalOut,
    SpaceGoalSuggestionOut,
    SpaceGoalUpdateIn,
)
from services import goal_extract_service, project_service, space_goal_service

router = APIRouter(prefix="/projects", tags=["space-goals"])

_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="project_not_found"
)


async def _owned_or_404(
    db: AsyncSession, user: CurrentUser, project_id: uuid.UUID
) -> None:
    project = await project_service.get_owned_project(
        db, user_id=user.id, project_id=project_id
    )
    if project is None:
        raise _NOT_FOUND


def _refused(exc: space_goal_service.GoalRefused) -> HTTPException:
    """A refusal keeps the reason it was raised with — the service already
    decided whether this is a 404 (somebody else's id) or a 422 (a rule)."""
    return HTTPException(status_code=exc.status, detail=exc.reason)


@router.get("/{project_id}/goals/active", response_model=SpaceGoalOut | None)
async def get_active_goal(
    project_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SpaceGoalOut | None:
    """这个空间正在推进的方向 —— **没有就是 `null`**。

    只有 `active` 会被读到：`draft` 是某个人（包括系统）的猜测，`paused` 是学习者
    让系统先别推。两种都不该驱动任何决定，而这个判断在服务层，不在调用点。
    """
    await _owned_or_404(db, current_user, project_id)
    row = await space_goal_service.get_active(db, project_id=project_id)
    return space_goal_service.to_out(row) if row is not None else None


@router.get("/{project_id}/goals", response_model=list[SpaceGoalOut])
async def list_goals(
    project_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SpaceGoalOut]:
    """这个空间的目标史，最新在前。一个空间可以有很多个（关掉一个、再开一个）。"""
    rows = await space_goal_service.list_for_space(
        db, user_id=current_user.id, project_id=project_id, limit=limit
    )
    if rows is None:
        raise _NOT_FOUND
    return [space_goal_service.to_out(row) for row in rows]


@router.post(
    "/{project_id}/goals", response_model=SpaceGoalOut, status_code=status.HTTP_201_CREATED
)
async def create_goal(
    project_id: uuid.UUID,
    payload: SpaceGoalCreateIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SpaceGoalOut:
    """记下一个目标。**产出的永远是 `draft`** —— 它还不能驱动任何东西。"""
    try:
        row = await space_goal_service.create_draft(
            db, user_id=current_user.id, project_id=project_id, payload=payload
        )
    except space_goal_service.GoalRefused as exc:
        raise _refused(exc) from exc
    return space_goal_service.to_out(row)


@router.post(
    "/{project_id}/goals/extract", response_model=SpaceGoalSuggestionOut
)
async def extract_goal(
    project_id: uuid.UUID,
    payload: SpaceGoalExtractIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SpaceGoalSuggestionOut:
    """读一句话，看里面有没有这个空间的目标。**返回建议，不写库。**

    `heard=false` 是正常结果（大多数话里没有目标）。读不出来是另一回事，回 502 ——
    让"模型没读到"和"你这句话里没有目标"长得不一样。
    """
    project = await project_service.get_owned_project(
        db, user_id=current_user.id, project_id=project_id
    )
    if project is None:
        raise _NOT_FOUND
    try:
        draft = await goal_extract_service.extract_goal(
            payload.message, user_id=current_user.id, space_name=project.name
        )
    except goal_extract_service.GoalExtractUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
        ) from exc
    if draft is None:
        return SpaceGoalSuggestionOut(heard=False)
    return SpaceGoalSuggestionOut(
        heard=True,
        target_text=draft.target_text.strip(),
        deadline_at=draft.deadline_at,
        context=draft.context,
        purpose=draft.purpose,
    )


@router.post("/{project_id}/goals/{goal_id}/confirm", response_model=SpaceGoalOut)
async def confirm_goal(
    project_id: uuid.UUID,
    goal_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SpaceGoalOut:
    """学习者点头了 —— 从这一刻起它才是这个空间的方向。

    空间已经有一个 active 目标时会**拒绝**，而不是悄悄替换：两条活着的方向会让
    之后每一个决定都解释不清，而"先关掉旧的"这句话比静默丢弃便宜得多。
    """
    try:
        row = await space_goal_service.confirm(
            db, user_id=current_user.id, project_id=project_id, goal_id=goal_id
        )
    except space_goal_service.GoalRefused as exc:
        raise _refused(exc) from exc
    return space_goal_service.to_out(row)


@router.patch("/{project_id}/goals/{goal_id}", response_model=SpaceGoalOut)
async def update_goal(
    project_id: uuid.UUID,
    goal_id: uuid.UUID,
    payload: SpaceGoalUpdateIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SpaceGoalOut:
    """改目标说的话。改了会留下一条空间记忆（"目标改了：从…到…"），不产生新行。"""
    try:
        row = await space_goal_service.update(
            db,
            user_id=current_user.id,
            project_id=project_id,
            goal_id=goal_id,
            payload=payload,
        )
    except space_goal_service.GoalRefused as exc:
        raise _refused(exc) from exc
    return space_goal_service.to_out(row)


@router.post("/{project_id}/goals/{goal_id}/pause", response_model=SpaceGoalOut)
async def pause_goal(
    project_id: uuid.UUID,
    goal_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SpaceGoalOut:
    """先别推了。暂停**不是方向变了**，所以它不留记忆，也随时能恢复。"""
    try:
        row = await space_goal_service.pause(
            db, user_id=current_user.id, project_id=project_id, goal_id=goal_id
        )
    except space_goal_service.GoalRefused as exc:
        raise _refused(exc) from exc
    return space_goal_service.to_out(row)


@router.post("/{project_id}/goals/{goal_id}/resume", response_model=SpaceGoalOut)
async def resume_goal(
    project_id: uuid.UUID,
    goal_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SpaceGoalOut:
    """接着推这个方向。同样要先确认空间里没有另一个活着的目标。"""
    try:
        row = await space_goal_service.resume(
            db, user_id=current_user.id, project_id=project_id, goal_id=goal_id
        )
    except space_goal_service.GoalRefused as exc:
        raise _refused(exc) from exc
    return space_goal_service.to_out(row)


@router.post("/{project_id}/goals/{goal_id}/close", response_model=SpaceGoalOut)
async def close_goal(
    project_id: uuid.UUID,
    goal_id: uuid.UUID,
    payload: SpaceGoalCloseIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SpaceGoalOut:
    """结束一个目标。**理由必填**，而且它的前缀说明是谁关的。

    `user_*`（我达成了 / 我放弃 / 我换一个）是学习者的决定，之后不会被推翻；
    `system_*`（系统判断没有继续的理由）是系统的判断，新证据可以推翻它。两类
    共用一列，因为它们是同一件事的两个主语 —— 这一点由
    `services/space_goal_service.is_user_close` 判读。
    """
    try:
        row = await space_goal_service.close(
            db,
            user_id=current_user.id,
            project_id=project_id,
            goal_id=goal_id,
            reason=payload.reason,
        )
    except space_goal_service.GoalRefused as exc:
        raise _refused(exc) from exc
    return space_goal_service.to_out(row)
