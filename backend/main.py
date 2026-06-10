from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ai import init_ai_runtime, shutdown_ai_runtime
from api.v1.router import api_router
from core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Fail fast on a broken routing table and open the shared HTTP connection
    # pool that every AI provider call reuses for the process lifetime.
    init_ai_runtime()
    try:
        yield
    finally:
        await shutdown_ai_runtime()


app = FastAPI(title="Lemma AI Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)
