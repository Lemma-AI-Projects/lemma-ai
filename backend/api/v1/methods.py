"""Method registry read endpoints.

Read-only on purpose. Choosing a method is a property of a conversation (it is
sent with the chat turn and stored on `ai_conversations.method`), so there is no
"set the current method" call here to get out of sync with what the next turn
will actually use.

Two reads: the registry itself, and — for Focus's status bar — **what this space
is currently being taught with, said in a learner's words**.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user
from schemas.method import MethodOut, MethodStatusOut
from services import (
    conversation_service,
    method_service,
    project_service,
    space_goal_service,
)

router = APIRouter(prefix="/methods", tags=["methods"])

_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="project_not_found"
)


@router.get("", response_model=list[MethodOut])
async def list_methods(
    current_user: CurrentUser = Depends(get_current_user),
) -> list[dict[str, str]]:
    """Every method this build can run, in registry order."""
    return method_service.list_methods()


@router.get("/status", response_model=MethodStatusOut)
async def get_method_status(
    project_id: uuid.UUID = Query(alias="projectId"),
    conversation_id: uuid.UUID | None = Query(default=None, alias="conversationId"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MethodStatusOut:
    """Status bar 的四格 —— 动词，不是术语；没有进度，也没有分数。

    Which method this is: the given conversation's (if it is the caller's and
    belongs to that space), otherwise **the space's most recently taught
    conversation** — "whatever this space is currently being taught with" is the
    same rule the next turn uses, so the bar cannot disagree with what happens
    next.

    ⚠️ 它答的是**这个空间现在的样子**，不是"上一轮实际发生了什么"。上一轮真正
    用了哪一格，记在那条消息的 digest 里（`ai_messages.agent_context_json`）——
    两个问题不同，别把这一份当成历史。
    """
    project = await project_service.get_owned_project(
        db, user_id=current_user.id, project_id=project_id
    )
    if project is None:
        raise _NOT_FOUND

    method_name: str | None = None
    if conversation_id is not None:
        conversation = await conversation_service.get_owned_conversation(
            db, user_id=current_user.id, conversation_id=conversation_id
        )
        # 别人的会话、或者不属于这个空间的会话：都当作不存在。
        if conversation is None or conversation.project_id != project_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="conversation_not_found"
            )
        method_name = conversation.method
    else:
        recent = await conversation_service.list_project_conversations(
            db, project_id=project_id, limit=1
        )
        if recent:
            method_name = recent[0][0].method

    goal = await space_goal_service.load_fact(db, project_id=project_id)
    directive = method_service.method_status(method_name=method_name, goal=goal)
    return MethodStatusOut(
        system_move=directive.system_move,
        learner_move=directive.learner_move,
        completion=directive.completion,
        goal_relation=directive.goal_relation,
    )
