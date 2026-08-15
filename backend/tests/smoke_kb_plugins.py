"""插件市场 API smoke（backend 惯例：直接脚本断言）。

覆盖（sqlite 内存库 + dependency_overrides）：
  1. GET /plugins：新用户懒播种 installed_default → 默认插件 installed=true
  2. POST /plugins/{id}/install：安装 → true；重复安装幂等
  3. DELETE /plugins/{id}/install：卸载 → false
  4. POST 不存在的插件 → 404
  5. GET 列表完整（目录 + subject + 排序）
"""
import asyncio
import os
import sys
import uuid
from collections.abc import AsyncGenerator

os.environ.setdefault("SUPABASE_URL", "http://localhost")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("OPENROUTER_API_KEY", "dummy")
os.environ.setdefault("AIHUBMIX_API_KEY", "dummy")

sys.path.insert(0, ".")

import httpx  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.ext.asyncio import (  # noqa: E402
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from api.v1 import plugins as plugins_api  # noqa: E402
from core.database import get_db  # noqa: E402
from core.security import CurrentUser  # noqa: E402

TEST_UID = uuid.UUID("22222222-2222-2222-2222-222222222222")

# ── 内存 sqlite + 建表 + 种子 ───────────────────────────────────────────────
engine = create_async_engine("sqlite+aiosqlite:///:memory:")
SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

DDL = """
CREATE TABLE plugins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    subject TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    installed_default BOOLEAN NOT NULL DEFAULT 0
);
CREATE TABLE user_plugins (
    user_id TEXT NOT NULL,
    plugin_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, plugin_id)
);
INSERT INTO plugins (id, name, description, subject, icon_name, sort_order, installed_default) VALUES
  ('computer-use', 'Computer Use', 'Control Mac apps from Lemma', 'general', 'AppWindow', 0, 1),
  ('math-solver', 'Math Solver', 'Solve math problems step by step', 'math', 'Calculator', 1, 1),
  ('physics-lab', 'Physics Lab', 'Interactive physics experiments', 'physics', 'Atom', 2, 0),
  ('chess-trainer', 'Chess Trainer', 'Practice chess tactics', 'chess', 'Target', 3, 0);
"""


async def get_test_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def fake_current_user() -> CurrentUser:
    return CurrentUser(id=TEST_UID, email="test@lemma.dev")


app = FastAPI()
app.include_router(plugins_api.router)
app.dependency_overrides[get_db] = get_test_db
app.dependency_overrides[plugins_api.get_current_user] = fake_current_user


async def main() -> None:
    async with engine.begin() as conn:
        for stmt in DDL.split(";"):
            if stmt.strip():
                await conn.execute(text(stmt))

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        # 1. GET：懒播种默认插件
        r = await c.get("/plugins")
        assert r.status_code == 200, r.status_code
        body = r.json()["plugins"]
        by_id = {p["id"]: p for p in body}
        assert len(by_id) == 4, len(by_id)
        assert by_id["computer-use"]["installed"] is True
        assert by_id["math-solver"]["installed"] is True
        assert by_id["physics-lab"]["installed"] is False
        assert by_id["physics-lab"]["subject"] == "physics"
        assert by_id["physics-lab"]["iconName"] == "Atom"  # to_camel
        # 排序
        assert [p["id"] for p in body] == ["computer-use", "math-solver", "physics-lab", "chess-trainer"]
        print("1. GET 懒播种默认安装 + 目录完整 + 排序 OK")

        # 2. POST install（物理插件）
        r = await c.post("/plugins/physics-lab/install")
        assert r.status_code == 200, r.status_code
        assert r.json()["installed"] is True
        # 幂等：再装一次
        r = await c.post("/plugins/physics-lab/install")
        assert r.status_code == 200 and r.json()["installed"] is True
        print("2. POST 安装 + 幂等 OK")

        # 3. DELETE uninstall（默认插件也能卸载）
        r = await c.delete("/plugins/math-solver/install")
        assert r.status_code == 204, r.status_code
        r = await c.get("/plugins")
        by_id = {p["id"]: p for p in r.json()["plugins"]}
        assert by_id["math-solver"]["installed"] is False
        assert by_id["physics-lab"]["installed"] is True
        print("3. DELETE 卸载（含默认插件）OK")

        # 4. 不存在的插件 → 404
        r = await c.post("/plugins/nonexistent/install")
        assert r.status_code == 404, r.status_code
        print("4. 404 OK")

        # 5. 懒播种幂等：卸载后再 GET 不重新播种（用户已有记录）
        r = await c.get("/plugins")
        by_id = {p["id"]: p for p in r.json()["plugins"]}
        assert by_id["math-solver"]["installed"] is False  # 不复活
        print("5. 懒播种不覆盖用户操作 OK")

    await engine.dispose()
    print("PLUGINS API SMOKE OK")


asyncio.run(main())
