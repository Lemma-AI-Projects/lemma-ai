"""插件市场端点（P2 真实化）。

- GET  /plugins            → 目录 + 当前用户安装态（新用户懒播种 installed_default）
- POST /plugins/{id}/install   → 安装（幂等）
- DELETE /plugins/{id}/install → 卸载

语义（P1 决策）：插件 = 学科能力包；安装 = 启用该学科在首页建议的参与权。
数据：plugins（静态目录种子）+ user_plugins（RLS 按 auth.uid() 隔离）。
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user

router = APIRouter(prefix="/plugins", tags=["plugins"])


class PluginOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    name: str
    description: str
    subject: str
    icon_name: str
    installed: bool


class PluginListOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    plugins: list[PluginOut]


async def _lazy_seed_defaults(db: AsyncSession, user_id: str) -> None:
    """新用户懒初始化：无任何安装记录时播种 installed_default 插件。
    幂等（NOT EXISTS 守卫）；之后用户显式安装/卸载全走 user_plugins。"""
    await db.execute(
        text(
            "INSERT INTO user_plugins (user_id, plugin_id) "
            "SELECT :uid, id FROM plugins WHERE installed_default "
            "AND NOT EXISTS (SELECT 1 FROM user_plugins WHERE user_id = :uid)"
        ),
        {"uid": user_id},
    )
    await db.commit()


@router.get("", response_model=PluginListOut)
async def list_plugins(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PluginListOut:
    await _lazy_seed_defaults(db, str(current_user.id))
    rows = (
        await db.execute(
            text(
                "SELECT p.id, p.name, p.description, p.subject, p.icon_name, "
                "EXISTS(SELECT 1 FROM user_plugins up "
                "       WHERE up.user_id = :uid AND up.plugin_id = p.id) AS installed "
                "FROM plugins p ORDER BY p.sort_order"
            ),
            {"uid": str(current_user.id)},
        )
    ).mappings().all()
    return PluginListOut(
        plugins=[
            PluginOut(
                id=r["id"],
                name=r["name"],
                description=r["description"],
                subject=r["subject"],
                icon_name=r["icon_name"],
                installed=bool(r["installed"]),
            )
            for r in rows
        ]
    )


async def _get_catalog_plugin(
    db: AsyncSession, plugin_id: str
) -> dict | None:
    row = (
        await db.execute(
            text(
                "SELECT id, name, description, subject, icon_name "
                "FROM plugins WHERE id = :id"
            ),
            {"id": plugin_id},
        )
    ).mappings().first()
    return dict(row) if row else None


@router.post("/{plugin_id}/install", response_model=PluginOut)
async def install_plugin(
    plugin_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PluginOut:
    catalog = await _get_catalog_plugin(db, plugin_id)
    if catalog is None:
        raise HTTPException(status_code=404, detail="plugin not found")
    await db.execute(
        text(
            "INSERT INTO user_plugins (user_id, plugin_id) "
            "VALUES (:uid, :pid) ON CONFLICT DO NOTHING"
        ),
        {"uid": str(current_user.id), "pid": plugin_id},
    )
    await db.commit()
    return PluginOut(**catalog, installed=True)


@router.delete("/{plugin_id}/install", status_code=204)
async def uninstall_plugin(
    plugin_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await db.execute(
        text(
            "DELETE FROM user_plugins WHERE user_id = :uid AND plugin_id = :pid"
        ),
        {"uid": str(current_user.id), "pid": plugin_id},
    )
    await db.commit()
