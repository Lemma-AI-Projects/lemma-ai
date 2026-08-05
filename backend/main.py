from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ai import init_ai_runtime, shutdown_ai_runtime
from ai.search import aclose_search_clients
from api.v1.router import api_router
from core.aio import drain_protected_writes
from core.config import settings

# Dev dashboard (/admindev): mounted and instrumented ONLY when enabled.
if settings.dev_dashboard_enabled:
    from admindev import monitor as admindev_monitor
    from admindev.router import router as admindev_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Fail fast on a broken routing table and open the shared HTTP connection
    # pool that every AI provider call reuses for the process lifetime.
    init_ai_runtime()
    try:
        yield
    finally:
        # In-flight protected writes (chat persistence, ledger rows spawned by
        # disconnected requests) land before pools close.
        await drain_protected_writes()
        # Close the web loop's self-built search client(s) (bilibili httpx + WBI
        # cache); mirrors the worker's per-task aclose in tasks/course_build.py.
        await aclose_search_clients()
        await shutdown_ai_runtime()


app = FastAPI(title="Lemma AI Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Response headers the browser lets frontend JS read (CORS hides the rest).
    expose_headers=["X-Conversation-Id"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)

if settings.dev_dashboard_enabled:

    @app.middleware("http")
    async def dev_metrics(request, call_next):  # noqa: ANN001 — Starlette signature
        admindev_monitor.note_request()
        try:
            return await call_next(request)
        except Exception:
            admindev_monitor.note_error()
            raise

    app.include_router(admindev_router)
