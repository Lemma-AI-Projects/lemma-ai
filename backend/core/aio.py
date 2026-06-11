"""Asyncio helpers for writes that must survive request cancellation.

When a browser closes an SSE connection, uvicorn/starlette cancel the whole
response task — and under anyio's cancel scopes EVERY subsequent await in
that task keeps re-raising CancelledError. Any DB write still running inside
the request task dies with it; worse, asyncio holds only WEAK references to
tasks, so a spawned-but-unreferenced write task can be garbage-collected
mid-flight ("The garbage collector is trying to clean up non-checked-in
connection" — observed live, 2026-06-12).

spawn_protected() fixes both: the write runs on its own task, pinned by a
module-level strong reference until done, fully independent of the dying
request. Scheduling is synchronous, so it works even from teardown paths
where every await would instantly re-raise cancellation.
"""

import asyncio
import logging
from collections.abc import Coroutine
from typing import Any

logger = logging.getLogger(__name__)

_protected_tasks: set[asyncio.Task[Any]] = set()


def _on_done(task: asyncio.Task[Any]) -> None:
    _protected_tasks.discard(task)
    if not task.cancelled() and (exc := task.exception()) is not None:
        logger.error("protected write failed", exc_info=exc)


def spawn_protected(coro: Coroutine[Any, Any, Any]) -> asyncio.Task[Any]:
    """Schedule a write to run to completion regardless of caller fate."""
    task = asyncio.create_task(coro)
    _protected_tasks.add(task)
    task.add_done_callback(_on_done)
    return task


async def drain_protected_writes() -> None:
    """Lifespan shutdown: let in-flight writes land before pools close."""
    if _protected_tasks:
        await asyncio.gather(*list(_protected_tasks), return_exceptions=True)
