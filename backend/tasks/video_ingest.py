"""Video ingest pipeline: download -> mp4 -> Gemini Files API (终稿 9.3).

Covers every video source by policy (最新决策 2): B站/YouTube links AND user
uploads (passed as a direct file URL) all end up as a provider file reference;
nothing is ever inlined into a model request.

Celery 纪律 (终稿 9.3):
- the task body wraps async work in asyncio.run() — fresh event loop per task
- provider clients are built and closed inside the task (fresh_client=True),
  never reused from the web process
- arguments and results are plain JSON-serializable values

System dependency: yt-dlp needs ffmpeg on PATH for remuxing (brew install
ffmpeg locally; add it to the Render worker image on deploy).

TODO(complex-transcode): segmented transcode / frame extraction + ASR fallback
for very long videos stays out of scope until a real need shows up (终稿 14).
"""

import asyncio
import tempfile
from pathlib import Path
from typing import Any

from ai import upload_video
from tasks.celery_app import celery_app
from tasks.ytdlp import download_to_mp4


@celery_app.task(name="video.ingest", bind=True, max_retries=2, default_retry_delay=60)
def ingest_video(self, source_url: str) -> dict[str, Any]:  # noqa: ANN001 — celery bind
    """Download a video and upload it to the provider Files API.

    Returns a JSON-safe provider file reference (the fields of VideoInput);
    services rebuild it via ai.from_provider_file() to call ask_video().
    """
    try:
        return asyncio.run(_ingest(source_url))
    except Exception as exc:  # noqa: BLE001 — let celery retry transient failures
        raise self.retry(exc=exc)


async def _ingest(source_url: str) -> dict[str, Any]:
    with tempfile.TemporaryDirectory(prefix="lemma_ingest_") as tmp_dir:
        video_path = download_to_mp4(source_url, Path(tmp_dir))
        video = await upload_video(
            str(video_path), mime_type="video/mp4", fresh_client=True
        )
    return video.model_dump(mode="json")
