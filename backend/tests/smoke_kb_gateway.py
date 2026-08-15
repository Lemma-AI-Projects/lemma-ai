"""kb-engine K3 网关透传 smoke（backend 惯例：直接脚本断言）。

验证（用本地假侧车 http.server 模拟 kb-engine）：
  1. 未配置 kb_engine_url → 503（fail loudly）
  2. GET 透传：method/path/query/X-Lemma-User-Id 头正确
  3. POST 写路径：body 转发 + query 保留
  4. 侧车不可达 → 503
  5. 响应状态码与 content-type 透传（假侧车 201 原样到达）
"""
import asyncio
import json
import os
import sys
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# Settings 必填字段（import core.config 前预填，否则 Settings() 实例化失败）
os.environ.setdefault("SUPABASE_URL", "http://localhost")
os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/kb-smoke.db")
os.environ.setdefault("OPENROUTER_API_KEY", "dummy")
os.environ.setdefault("AIHUBMIX_API_KEY", "dummy")

sys.path.insert(0, ".")

import httpx  # noqa: E402
from fastapi import FastAPI  # noqa: E402

from api.v1 import kb_gateway  # noqa: E402
from core.config import settings  # noqa: E402
from core.security import CurrentUser  # noqa: E402

# ── 假侧车（记录请求，写路径返回 201 + JSON） ────────────────────────────────
received: list[dict] = []


class FakeSidecar(BaseHTTPRequestHandler):
    def _handle(self) -> None:
        length = int(self.headers.get("Content-Length", 0) or 0)
        body = self.rfile.read(length).decode("utf-8") if length else ""
        received.append(
            {
                "method": self.command,
                "path": self.path,
                "uid": self.headers.get("X-Lemma-User-Id"),
                "body": body,
            }
        )
        payload = json.dumps({"noteId": "fake-1"}).encode("utf-8")
        self.send_response(201)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    do_GET = _handle
    do_POST = _handle
    do_PUT = _handle
    do_PATCH = _handle
    do_DELETE = _handle

    def log_message(self, *args) -> None:  # 静默
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), FakeSidecar)
sidecar_port = server.server_address[1]
threading.Thread(target=server.serve_forever, daemon=True).start()


# ── 认证依赖覆盖 + 最小 app ───────────────────────────────────────────────────
async def fake_current_user() -> CurrentUser:
    return CurrentUser(id=uuid.UUID("11111111-1111-1111-1111-111111111111"), email=None)


app = FastAPI()
app.include_router(kb_gateway.router)
app.dependency_overrides[kb_gateway.get_current_user] = fake_current_user


async def main() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://test"
    ) as client:
        # ── 1. 未配置 → 503 ───────────────────────────────────────────────────
        settings.kb_engine_url = ""
        r = await client.get("/kb/api/tree")
        assert r.status_code == 503, f"expect 503 got {r.status_code}"
        print("1. 未配置 kb_engine_url → 503 OK")

        # ── 2. GET 透传 ───────────────────────────────────────────────────────
        settings.kb_engine_url = f"http://127.0.0.1:{sidecar_port}"
        r = await client.get("/kb/api/tree?x=1")
        assert r.status_code == 201, f"expect 201 got {r.status_code}"
        assert r.json() == {"noteId": "fake-1"}
        req = received[-1]
        assert req["method"] == "GET"
        assert req["path"] == "/kb/api/tree?x=1", req["path"]
        assert req["uid"] == "11111111-1111-1111-1111-111111111111", req["uid"]
        print("2. GET 透传（method/path/query/uid 头）OK")

        # ── 3. POST 写路径 + body ─────────────────────────────────────────────
        r = await client.post(
            "/kb/api/notes/seed-1/children?target=into",
            json={"title": "子笔记", "type": "text"},
        )
        assert r.status_code == 201, f"expect 201 got {r.status_code}"
        req = received[-1]
        assert req["method"] == "POST"
        assert req["path"] == "/kb/api/notes/seed-1/children?target=into", req["path"]
        assert '"title"' in req["body"] and "子笔记" in req["body"], req["body"]
        print("3. POST 写路径（body + query 透传）OK")

        # ── 4. 侧车不可达 → 503 ───────────────────────────────────────────────
        settings.kb_engine_url = "http://127.0.0.1:1"
        r = await client.get("/kb/api/tree")
        assert r.status_code == 503, f"expect 503 got {r.status_code}"
        print("4. 侧车不可达 → 503 OK")


asyncio.run(main())
server.shutdown()
print("K3 GATEWAY SMOKE OK")
