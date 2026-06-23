"""Shared chapter-overview generation core (SSE 端点 + 物料化 step 共用).

Given a READY chapter `VideoInput`, stream the learning overview and persist it on
a clean `done` (mark_ready); on `error` mark_failed; a disconnect before `done`
leaves the row `generating` for reclaim. Yields AIChunk so the SSE endpoint can
`encode_chunk` them, and the materialize step can drain them — persistence is the
same either way (DB is the source of truth for ready/failed). Persistence runs on
a protected task so a client disconnect (endpoint path) still lands the note.
"""

import asyncio
import contextlib
import uuid
from collections.abc import AsyncIterator

from ai import AIChunk, AIUseCase, VideoInput, ai_client
from core import aio
from core.database import AsyncSessionLocal
from services import course_overview_service

# The user-turn instruction; the structure/style live in the COURSE_OVERVIEW
# system prompt (rules 第八章: prompts in templates, not business code).
OVERVIEW_INSTRUCTION = (
    "请基于本章节视频，为正在学习这一章的学生写一份学习向的章节概述。"
)


async def _persist_ready(
    chapter_id: uuid.UUID, candidate_id: uuid.UUID, markdown: str
) -> None:
    async with AsyncSessionLocal() as db:
        await course_overview_service.mark_ready(
            db, chapter_id=chapter_id, candidate_id=candidate_id, markdown=markdown
        )


async def _persist_failed(chapter_id: uuid.UUID, error_type: str | None) -> None:
    async with AsyncSessionLocal() as db:
        await course_overview_service.mark_failed(
            db, chapter_id=chapter_id, error_type=error_type
        )


async def generate_overview_chunks(
    *,
    course_id: uuid.UUID,
    user_id: uuid.UUID,
    chapter_id: uuid.UUID,
    candidate_id: uuid.UUID,
    video: VideoInput,
) -> AsyncIterator[AIChunk]:
    """Stream the overview for a ready video and persist on a clean done.

    Caller must already hold the generation claim (claim_for_generate). Yields the
    raw AIChunk stream; the endpoint encodes to SSE, the step drains it.
    """
    parts: list[str] = []
    persist_task: asyncio.Task | None = None
    done_seen = False
    failed_code: str | None = None

    def ensure_persist_scheduled() -> None:
        nonlocal persist_task
        markdown = "".join(parts)
        if persist_task is None and markdown:
            persist_task = aio.spawn_protected(
                _persist_ready(chapter_id, candidate_id, markdown)
            )

    chunk_stream = ai_client.stream_ask_video(
        AIUseCase.COURSE_OVERVIEW,
        video,
        OVERVIEW_INSTRUCTION,
        history=[],
        user_id=str(user_id),
        course_id=str(course_id),
    )
    try:
        async for chunk in chunk_stream:
            if chunk.kind == "delta" and chunk.text:
                parts.append(chunk.text)
            elif chunk.kind == "done":
                done_seen = True
                ensure_persist_scheduled()
            elif chunk.kind == "error":
                failed_code = chunk.error_code
            yield chunk
    finally:
        if done_seen:
            ensure_persist_scheduled()
        elif failed_code is not None:
            aio.spawn_protected(_persist_failed(chapter_id, failed_code))
        # else: disconnected mid-stream -> leave `generating` for reclaim.
        with contextlib.suppress(Exception):
            await chunk_stream.aclose()
        if persist_task is not None and not persist_task.done():
            with contextlib.suppress(asyncio.CancelledError):
                await asyncio.shield(persist_task)
