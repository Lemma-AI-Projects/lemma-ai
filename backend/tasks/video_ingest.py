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

import yt_dlp

from ai import upload_video
from core.config import settings
from tasks.celery_app import celery_app

# Cap quality to keep uploads inside Files API comfort zone; Gemini samples
# video at ~1fps anyway, so higher resolutions only burn bandwidth.
_YDL_FORMAT = "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/b[height<=720]/b"


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
        video_path = _download(source_url, Path(tmp_dir))
        video = await upload_video(
            str(video_path), mime_type="video/mp4", fresh_client=True
        )
    return video.model_dump(mode="json")


def _download(source_url: str, target_dir: Path) -> Path:
    """yt-dlp handles B站/YouTube extraction and plain http(s) file URLs alike."""
    options = {
        "format": _YDL_FORMAT,
        "outtmpl": str(target_dir / "%(id)s.%(ext)s"),
        "merge_output_format": "mp4",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
    }
    if settings.ytdlp_cookie_file:
        # B站 metadata API returns HTTP 412 (risk control) without real
        # browser cookies; ops provisions them via YTDLP_COOKIE_FILE.
        options["cookiefile"] = settings.ytdlp_cookie_file
    with yt_dlp.YoutubeDL(options) as ydl:
        info = ydl.extract_info(source_url, download=True)
        path = Path(ydl.prepare_filename(info)).with_suffix(".mp4")
    if not path.is_file():
        raise FileNotFoundError(f"yt-dlp produced no mp4 for {source_url}")
    return path
