"""Shared yt-dlp download primitive (video_ingest + video_download both use it).

Downloads any B站/YouTube link or plain http(s) file URL to a local mp4. The
720p cap keeps files inside provider comfort zones; B站 needs real browser
cookies (HTTP 412 otherwise) supplied via YTDLP_COOKIE_FILE.

System dependency: ffmpeg on PATH (yt-dlp remuxing) — brew install ffmpeg
locally; add it to the Render worker image on deploy.
"""

from pathlib import Path

import yt_dlp

from core.config import settings

# Cap quality to keep downloads/uploads sane; higher resolutions only burn
# bandwidth (Gemini samples ~1fps; learners don't need >720p re-hosted).
_YDL_FORMAT = (
    "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/b[height<=720]/b"
)


def download_to_mp4(source_url: str, target_dir: Path) -> Path:
    """Download `source_url` into `target_dir` and return the produced mp4 path."""
    options = {
        "format": _YDL_FORMAT,
        "outtmpl": str(target_dir / "%(id)s.%(ext)s"),
        "merge_output_format": "mp4",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
    }
    if settings.ytdlp_cookie_file:
        # B站 metadata API returns HTTP 412 (risk control) without real browser
        # cookies; ops provisions them via YTDLP_COOKIE_FILE.
        options["cookiefile"] = settings.ytdlp_cookie_file
    with yt_dlp.YoutubeDL(options) as ydl:
        info = ydl.extract_info(source_url, download=True)
        path = Path(ydl.prepare_filename(info)).with_suffix(".mp4")
    if not path.is_file():
        raise FileNotFoundError(f"yt-dlp produced no mp4 for {source_url}")
    return path
