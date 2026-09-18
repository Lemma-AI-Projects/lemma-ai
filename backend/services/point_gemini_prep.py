"""Shared 「确保本学习点 Gemini 文件就绪」 driver — the companion video tool.

The companion needs the point's video as a usable Gemini file reference before
it can answer about what the learner is watching, and it must self-drive the
dependency chain when it's cold: 无资产 → 下载（Celery）→ 上传 Gemini（Celery）
→ 就绪. This streams that wait as `preparing` ticks and resolves to the
VideoInput (or unavailable/failed), so the caller stays dumb: the companion tool
maps it to ToolProgress/ToolResult. The heavy work stays in Celery; here we only
poll the cache + enqueue, each tick on its own short-lived session.

Materialization deliberately does NOT pre-warm this: a Gemini file expires in
~48h, long before most learners reach a given point, so the upload is paid for
on first real use instead of on every point at build time.
"""

import asyncio
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Literal

from ai.types import VideoInput
from core.database import AsyncSessionLocal
from services import gemini_file_service, video_asset_service

# Poll cadence + ceiling while the video is downloaded then uploaded to Gemini.
# A timeout is retryable (the ingest likely lands and the retry hits the cache).
_POLL_S = 2.0
_MAX_TICKS = 180  # ~6 min ceiling


@dataclass
class PrepEvent:
    """A step in readying the point's Gemini file.

    - preparing:   still downloading/uploading — heartbeat the wait;
    - ready:       `video` is a usable Gemini file reference;
    - unavailable: this node has no video (no point / no chosen candidate);
    - failed:      the download or upload failed / timed out.
    """

    kind: Literal["preparing", "ready", "unavailable", "failed"]
    video: VideoInput | None = None


async def stream_until_usable(
    *,
    point_id: uuid.UUID | None,
    candidate_id: uuid.UUID | None,
    poll_s: float = _POLL_S,
    max_ticks: int = _MAX_TICKS,
) -> AsyncIterator[PrepEvent]:
    """Yield `preparing` ticks while driving 下载→上传, then a terminal event.

    candidate_id is the point's chosen candidate (keys the cache + detects a
    re-pick). None for either id ⇒ no video for this context ⇒ `unavailable`.
    """
    if point_id is None or candidate_id is None:
        yield PrepEvent(kind="unavailable")
        return

    ingest_enqueued = False
    for _tick in range(max_ticks):
        async with AsyncSessionLocal() as db:
            video = await gemini_file_service.read_usable(
                db, point_id=point_id, candidate_id=candidate_id
            )
            if video is not None:
                yield PrepEvent(kind="ready", video=video)
                return
            if (
                ingest_enqueued
                and await gemini_file_service.read_status(db, point_id=point_id)
                == "failed"
            ):
                yield PrepEvent(kind="failed")
                return
            asset_status = await video_asset_service.ensure_download(
                db, point_id=point_id, candidate_id=candidate_id
            )
            if asset_status == "failed":
                yield PrepEvent(kind="failed")
                return
            if asset_status == "ready" and not ingest_enqueued:
                await gemini_file_service.ensure_pending(
                    db, point_id=point_id, candidate_id=candidate_id
                )
                # Lazy import: tasks import services, so a top-level import cycles.
                from tasks.point_gemini_ingest import ingest_point_gemini_file

                ingest_point_gemini_file.delay(str(point_id))
                ingest_enqueued = True
        yield PrepEvent(kind="preparing")
        await asyncio.sleep(poll_s)

    # Ceiling hit without a ready file — retryable (the ingest may still land).
    yield PrepEvent(kind="failed")
