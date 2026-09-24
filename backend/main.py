import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ai import init_ai_runtime, shutdown_ai_runtime
from ai.search import aclose_search_clients
from api.v1.router import api_router
from core.aio import drain_protected_writes
from core.config import settings
from services import scheduler_service


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Fail fast on a broken routing table and open the shared HTTP connection
    # pool that every AI provider call reuses for the process lifetime.
    init_ai_runtime()
    # The Scheduler's clock: a poll loop over `scheduled_tasks` that holds no
    # state of its own. Starting it here IS the restart-recovery mechanism —
    # whatever came due while the process was down is due on the first tick.
    clock: asyncio.Task[None] | None = None
    if settings.scheduler_enabled:
        clock = asyncio.create_task(
            scheduler_service.run_forever(settings.scheduler_poll_seconds),
            name="scheduler-clock",
        )
    try:
        yield
    finally:
        if clock is not None:
            clock.cancel()
            with suppress(asyncio.CancelledError):
                await clock
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
