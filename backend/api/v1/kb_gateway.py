"""kb-engine 网关（P0-4 骨架 + K3 全量 API 透传）：认证 + 转发。

信任模型：FastAPI 是唯一外部入口（Supabase JWT + IDOR），kb-engine Node 侧车
只监听内网。本网关把当前用户 id 注入 X-Lemma-User-Id 头转发给侧车——侧车的
RLS 中间件据此设置会话级 app.user_id，完成租户隔离。

P0 显式路由（/notes、/notes/tree、/health）保留向后兼容；
K3 新增 catch-all /api/{path:path} 透传引擎全量 REST 层（/kb/api/*），
支持 GET/POST/PUT/PATCH/DELETE、请求 body、query、状态码与 content-type 透传。

侧车不可达/错误 → 503/502（fail loudly，不静默返回空数据）。
"""
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response

from core.config import settings
from core.security import CurrentUser, get_current_user

router = APIRouter(prefix="/kb", tags=["knowledge-base"])

KB_ENGINE_TIMEOUT = 10.0
# 引擎全量 REST 层支持的方法（K2 挂载的 buildSharedApiRoutes 路由集）
_FULL_API_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]


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


@router.api_route("/api/{path:path}", methods=_FULL_API_METHODS)
async def full_api_proxy(
    path: str,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
) -> Response:
    """透传引擎全量 REST 层（K3）：/api/v1/kb/api/* → 侧车 /kb/api/*。

    保留 method / query / body / headers；响应状态码与 content-type 原样透传
    （写路径返回 200/204/400，读路径 200——与引擎语义一致）。
    门控：侧车 KB_FULL_API_ENABLED=false 时引擎 404 → 本网关 502（fail loudly）。
    """
    if not settings.kb_engine_url:
        raise HTTPException(status_code=503, detail="knowledge engine not configured")
    url = f"{settings.kb_engine_url}/kb/api/{path}"
    headers = {
        "X-Lemma-User-Id": str(current_user.id),
        "Content-Type": request.headers.get("content-type", "application/json"),
    }
    body = await request.body()
    try:
        async with httpx.AsyncClient(timeout=KB_ENGINE_TIMEOUT) as client:
            resp = await client.request(
                request.method,
                url,
                headers=headers,
                content=body or None,
                params=request.query_params,
            )
    except httpx.HTTPError as e:
        raise HTTPException(status_code=503, detail="knowledge engine unavailable") from e
    if resp.status_code >= 500:
        raise HTTPException(
            status_code=502,
            detail=f"knowledge engine error: {resp.status_code}",
        )
    media_type = resp.headers.get("content-type")
    return Response(content=resp.content, status_code=resp.status_code, media_type=media_type)


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
