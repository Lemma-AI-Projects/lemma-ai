"""kb-engine 网关（P0-4）：认证 + 转发。

信任模型：FastAPI 是唯一外部入口（Supabase JWT + IDOR），kb-engine Node 侧车
只监听内网。本网关把当前用户 id 注入 X-Lemma-User-Id 头转发给侧车——侧车的
RLS 中间件据此设置会话级 app.user_id，完成租户隔离。

侧车不可达/错误 → 503/502（fail loudly，不静默返回空数据）。
"""
import httpx
from fastapi import APIRouter, Depends, HTTPException

from core.config import settings
from core.security import CurrentUser, get_current_user

router = APIRouter(prefix="/kb", tags=["knowledge-base"])

KB_ENGINE_TIMEOUT = 10.0


async def _forward(path: str, current_user: CurrentUser) -> dict:
    if not settings.kb_engine_url:
        raise HTTPException(status_code=503, detail="knowledge engine not configured")
    url = f"{settings.kb_engine_url}{path}"
    headers = {"X-Lemma-User-Id": str(current_user.id)}
    try:
        async with httpx.AsyncClient(timeout=KB_ENGINE_TIMEOUT) as client:
            resp = await client.get(url, headers=headers)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=503, detail="knowledge engine unavailable") from e
    if resp.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"knowledge engine error: {resp.status_code}",
        )
    return resp.json()


@router.get("/notes")
async def list_notes(
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """当前用户的笔记列表（P0 目标：先接 notes 列表）。"""
    return await _forward("/kb/notes", current_user)


@router.get("/notes/tree")
async def notes_tree(
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """当前用户的笔记树（branches 关联组装）。"""
    return await _forward("/kb/notes/tree", current_user)


@router.get("/health")
async def health(
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """侧车探活。"""
    return await _forward("/kb/health", current_user)
