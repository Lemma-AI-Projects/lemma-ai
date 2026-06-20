"""Manual smoke for worker video download backends.

Run this on the Linux worker image after provisioning BBDown + ffmpeg:

    uv run python scripts/smoke_video_download_backends.py --bilibili
    uv run python scripts/smoke_video_download_backends.py --youtube

The script downloads into a temporary directory and verifies the produced mp4
with ffprobe. It does not touch DB, Storage, API routes, or Celery.
"""

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.config import settings
from tasks.video_source_download import download_video_to_mp4

DEFAULT_BILIBILI_URL = "https://www.bilibili.com/video/BV1GJ411x7h7/"
DEFAULT_YOUTUBE_URL = "https://www.youtube.com/watch?v=aqz-KE-bpKQ"

FAILURES: list[str] = []


def check(condition: bool, label: str) -> None:
    status = "PASS" if condition else "FAIL"
    print(f"{status}  {label}")
    if not condition:
        FAILURES.append(label)


def _ffprobe_path(value: str) -> str:
    if value:
        return value
    if settings.ffmpeg_path and settings.ffmpeg_path != "ffmpeg":
        candidate = Path(settings.ffmpeg_path).with_name("ffprobe")
        if candidate.is_file():
            return str(candidate)
    return shutil.which("ffprobe") or "ffprobe"


def _probe(path: Path, *, ffprobe_path: str) -> dict[str, Any]:
    result = subprocess.run(
        [
            ffprobe_path,
            "-v",
            "error",
            "-show_streams",
            "-show_format",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return json.loads(result.stdout)


def _check_video(path: Path, *, ffprobe_path: str, label: str) -> None:
    data = _probe(path, ffprobe_path=ffprobe_path)
    streams = data.get("streams") or []
    video_streams = [
        stream for stream in streams if stream.get("codec_type") == "video"
    ]
    audio_streams = [
        stream for stream in streams if stream.get("codec_type") == "audio"
    ]
    height = int(video_streams[0].get("height") or 0) if video_streams else 0
    duration = float((data.get("format") or {}).get("duration") or 0)
    check(
        path.is_file() and path.stat().st_size > 0,
        f"{label}: mp4 exists and non-empty",
    )
    check(bool(video_streams), f"{label}: has video stream")
    check(bool(audio_streams), f"{label}: has audio stream")
    check(duration > 0, f"{label}: duration > 0")
    check(height in {480, 720} or height >= 720, f"{label}: expected height ({height})")


def _download_and_probe(
    *,
    url: str,
    platform: str,
    ffprobe_path: str,
) -> None:
    with tempfile.TemporaryDirectory(prefix=f"lemma_smoke_{platform}_") as tmp_dir:
        result = download_video_to_mp4(url, Path(tmp_dir), platform=platform)
        print(f"{platform}: backend={result.backend} path={result.path}")
        _check_video(result.path, ffprobe_path=ffprobe_path, label=platform)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bilibili", action="store_true")
    parser.add_argument("--youtube", action="store_true")
    parser.add_argument("--bilibili-url", default=DEFAULT_BILIBILI_URL)
    parser.add_argument("--youtube-url", default=DEFAULT_YOUTUBE_URL)
    parser.add_argument("--ffprobe-path", default="")
    args = parser.parse_args()

    run_bilibili = args.bilibili or not args.youtube
    run_youtube = args.youtube
    ffprobe_path = _ffprobe_path(args.ffprobe_path)

    if run_bilibili:
        _download_and_probe(
            url=args.bilibili_url,
            platform="bilibili",
            ffprobe_path=ffprobe_path,
        )
    if run_youtube:
        _download_and_probe(
            url=args.youtube_url,
            platform="youtube",
            ffprobe_path=ffprobe_path,
        )

    if FAILURES:
        print(f"\nSMOKE FAILED: {len(FAILURES)} failure(s)")
        raise SystemExit(1)
    print("\nSMOKE OK: video download backends")


if __name__ == "__main__":
    main()
