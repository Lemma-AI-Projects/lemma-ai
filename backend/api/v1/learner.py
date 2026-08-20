"""Learner 记忆读接口（L1 主线闭环，2026-08-20）。

面向前端记忆面板 / 今日任务 的只读数据面：
  - GET /learner/memory/overview   面板概览（概念数 / 掌握分布 / 今日 due）
  - GET /learner/memory/knowledge  掌握度列表
  - GET /learner/review/due        今日待复习列表

门控规范：get_learner_service() 为 None（lemma_hermes_enabled=false）时统一
返回 enabled:false 降级结构，绝不 500。用户隔离：user_id 一律取自已鉴权的
当前用户（CurrentUser），不经 query 传入，杜绝跨用户读取。
"""

from fastapi import APIRouter, Depends, Query

from core.security import CurrentUser, get_current_user
from schemas.learner import (
    DueReviewOut,
    LearnerDisabledOut,
    MemoryOverviewOut,
    KnowledgeNodeOut,
)
from services.learner.learner_service import get_learner_service

router = APIRouter(prefix="/learner", tags=["learner"])


@router.get("/memory/overview", response_model=MemoryOverviewOut | LearnerDisabledOut)
def read_memory_overview(
    current_user: CurrentUser = Depends(get_current_user),
) -> MemoryOverviewOut | LearnerDisabledOut:
    svc = get_learner_service()
    if svc is None:
        return LearnerDisabledOut()
    data = svc.memory_overview(str(current_user.id))
    return MemoryOverviewOut.model_validate(data)


@router.get("/memory/knowledge", response_model=list[KnowledgeNodeOut] | LearnerDisabledOut)
def read_learner_knowledge(
    limit: int = Query(default=50, ge=1, le=200),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[KnowledgeNodeOut] | LearnerDisabledOut:
    svc = get_learner_service()
    if svc is None:
        return LearnerDisabledOut()
    rows = svc.get_knowledge(str(current_user.id), limit=limit)
    return [KnowledgeNodeOut.model_validate(r) for r in rows]


@router.get("/review/due", response_model=list[DueReviewOut] | LearnerDisabledOut)
def read_review_due(
    limit: int = Query(default=50, ge=1, le=200),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[DueReviewOut] | LearnerDisabledOut:
    svc = get_learner_service()
    if svc is None:
        return LearnerDisabledOut()
    rows = svc.get_due_reviews(str(current_user.id), limit=limit)
    return [DueReviewOut.model_validate(r) for r in rows]