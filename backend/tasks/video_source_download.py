"""Download backend routing for worker-side video fetches.

This module owns the "URL -> local mp4" boundary used by Celery tasks. YouTube
stays on yt-dlp; Bilibili prefers BBDown TV API and falls back to yt-dlp with
Bilibili headers when configured. The compatibility wrapper in tasks/ytdlp.py
keeps the old call sites working.
"""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import signal
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

import yt_dlp

from core.config import settings

logger = logging.getLogger("lemma.tasks.video_download.backends")

BACKEND_BBDOWN = "bbdown"
BACKEND_YTDLP = "ytdlp"
BACKEND_YTDLP_FALLBACK = "ytdlp-fallback"

_BBDOWN_FILE_PATTERN = "lemma_download"
_KNOWN_BACKENDS = {BACKEND_BBDOWN, BACKEND_YTDLP, BACKEND_YTDLP_FALLBACK}
_KNOWN_PLATFORMS = {"youtube", "bilibili", "default"}
_BILIBILI_HEADERS = {
    "Referer": "https://www.bilibili.com",
    "Origin": "https://www.bilibili.com",
}
# Cap quality to keep downloads/uploads sane; higher resolutions only burn
# bandwidth (Gemini samples ~1fps; learners don't need >720p re-hosted).
_YDL_FORMAT = (
    "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/b[height<=720]/b"
)


class VideoDownloadError(Exception):
    """A source video could not be downloaded to a playable local mp4."""


class VideoDownloadConfigError(VideoDownloadError):
    """Download backend configuration is missing or malformed."""


class VideoDownloadTimeoutError(VideoDownloadError):
    """The configured download timeout elapsed."""


@dataclass(frozen=True)
class DownloadResult:
    path: Path
    backend: str
    platform: str


def download_to_mp4(
    source_url: str, target_dir: Path, *, platform: str | None = None
) -> Path:
    """Compatibility wrapper: download and return only the produced mp4 path."""
    return download_video_to_mp4(
        source_url, target_dir, platform=platform
    ).path


def download_video_to_mp4(
    source_url: str,
    target_dir: Path,
    *,
    platform: str | None = None,
    chapter_id: object | None = None,
) -> DownloadResult:
    """Download `source_url` into `target_dir`, returning path + successful backend."""
    target_dir.mkdir(parents=True, exist_ok=True)
    normalized_platform = _resolve_platform(source_url, platform)
    errors: list[str] = []
    last_error: Exception | None = None

    for backend in _routes_for(normalized_platform):
        started = time.perf_counter()
        try:
            path = _run_backend(
                backend,
                source_url,
                target_dir,
                platform=normalized_platform,
            )
        except Exception as exc:  # noqa: BLE001 — normalize every backend failure
            error = _normalize_error(exc, backend=backend)
            last_error = error
            errors.append(f"{backend}: {type(error).__name__}")
            _log_attempt(
                platform=normalized_platform,
                backend=backend,
                chapter_id=chapter_id,
                success=False,
                latency_ms=_elapsed_ms(started),
                error_type=type(error).__name__,
                error_detail=str(error),
            )
            continue

        size_bytes = path.stat().st_size
        latency_ms = _elapsed_ms(started)
        _log_attempt(
            platform=normalized_platform,
            backend=backend,
            chapter_id=chapter_id,
            success=True,
            latency_ms=latency_ms,
            error_type=None,
            error_detail=None,
        )
        _log_event(
            "video_download_success",
            level="info",
            platform=normalized_platform,
            backend=backend,
            chapter_id=str(chapter_id) if chapter_id is not None else None,
            size_bytes=size_bytes,
            latency_ms=latency_ms,
        )
        return DownloadResult(
            path=path, backend=backend, platform=normalized_platform
        )

    message = (
        f"all video download backends failed for {normalized_platform}: "
        + "; ".join(errors)
    )
    raise VideoDownloadError(message) from last_error


def _routes_for(platform: str) -> list[str]:
    try:
        parsed = json.loads(settings.video_download_routes_json)
    except json.JSONDecodeError as exc:
        raise VideoDownloadConfigError(
            "VIDEO_DOWNLOAD_ROUTES_JSON is not valid JSON"
        ) from exc
    if not isinstance(parsed, dict):
        raise VideoDownloadConfigError("VIDEO_DOWNLOAD_ROUTES_JSON must be an object")

    unknown_platforms = set(parsed) - _KNOWN_PLATFORMS
    if unknown_platforms:
        names = ", ".join(sorted(unknown_platforms))
        raise VideoDownloadConfigError(
            f"VIDEO_DOWNLOAD_ROUTES_JSON has unknown platform(s): {names}"
        )

    raw_routes = parsed.get(platform) or parsed.get("default")
    if not isinstance(raw_routes, list) or not raw_routes:
        raise VideoDownloadConfigError(
            f"no video download route configured for platform '{platform}'"
        )

    routes: list[str] = []
    for item in raw_routes:
        backend = item.get("backend") if isinstance(item, dict) else item
        if not isinstance(backend, str):
            raise VideoDownloadConfigError(
                "video download backend entries must be strings"
            )
        backend = backend.strip()
        if backend not in _KNOWN_BACKENDS:
            raise VideoDownloadConfigError(
                f"unknown video download backend '{backend}'"
            )
        routes.append(backend)
    return routes


def _resolve_platform(source_url: str, platform: str | None) -> str:
    if platform:
        normalized = platform.strip().lower()
        if normalized in {"youtube", "bilibili"}:
            return normalized
    host = urlparse(source_url).netloc.lower()
    if "youtube.com" in host or "youtu.be" in host:
        return "youtube"
    if "bilibili.com" in host or host == "b23.tv":
        return "bilibili"
    return "default"


def _run_backend(
    backend: str,
    source_url: str,
    target_dir: Path,
    *,
    platform: str,
) -> Path:
    if backend == BACKEND_BBDOWN:
        return _download_with_bbdown(source_url, target_dir)
    if backend == BACKEND_YTDLP_FALLBACK:
        return _download_with_ytdlp(
            source_url,
            target_dir,
            bilibili_headers=platform == "bilibili",
        )
    if backend == BACKEND_YTDLP:
        return _download_with_ytdlp(source_url, target_dir, bilibili_headers=False)
    raise VideoDownloadConfigError(f"unsupported video download backend '{backend}'")


def _download_with_ytdlp(
    source_url: str,
    target_dir: Path,
    *,
    bilibili_headers: bool,
) -> Path:
    before = _mp4_files(target_dir)
    options: dict[str, Any] = {
        "format": _YDL_FORMAT,
        "outtmpl": str(target_dir / "%(id)s.%(ext)s"),
        "merge_output_format": "mp4",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "socket_timeout": settings.ytdlp_socket_timeout_seconds,
    }
    if settings.ffmpeg_path and settings.ffmpeg_path != "ffmpeg":
        options["ffmpeg_location"] = settings.ffmpeg_path
    if settings.ytdlp_cookie_file:
        options["cookiefile"] = settings.ytdlp_cookie_file
    if bilibili_headers:
        options["http_headers"] = _BILIBILI_HEADERS

    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(source_url, download=True)
            if not info:
                raise VideoDownloadError("yt-dlp returned no video info")
            expected = Path(ydl.prepare_filename(info)).with_suffix(".mp4")
    except VideoDownloadError:
        raise
    except Exception as exc:  # noqa: BLE001 — callers should see one error family
        raise VideoDownloadError(f"yt-dlp failed: {_truncate(str(exc))}") from exc

    if expected.is_file() and expected.stat().st_size > 0:
        return expected
    produced = _new_mp4_files(target_dir, before)
    if len(produced) == 1:
        return produced[0]
    if produced:
        raise VideoDownloadError(f"yt-dlp produced multiple mp4 files: {len(produced)}")
    raise VideoDownloadError(f"yt-dlp produced no mp4 for {source_url}")


def _download_with_bbdown(source_url: str, target_dir: Path) -> Path:
    executable = _resolve_executable(settings.bbdown_binary_path, "BBDOWN_BINARY_PATH")
    ffmpeg_path = settings.ffmpeg_path.strip() or "ffmpeg"
    work_dir = target_dir / "bbdown"
    work_dir.mkdir(parents=True, exist_ok=True)
    before = _mp4_files(work_dir)
    cmd = [
        executable,
        source_url,
        "--work-dir",
        str(work_dir),
        "--ffmpeg-path",
        ffmpeg_path,
        "--skip-subtitle",
        "--skip-cover",
        "-F",
        _BBDOWN_FILE_PATTERN,
        "-p",
        _select_page(source_url),
        "-q",
        settings.bbdown_quality_priority,
        "-e",
        settings.bbdown_encoding_priority,
    ]
    if settings.bbdown_use_tv_api:
        cmd.append("--use-tv-api")
    if settings.bbdown_cookie:
        cmd.extend(["-c", settings.bbdown_cookie])

    _run_subprocess(cmd, timeout_s=settings.video_download_timeout_seconds)
    expected = work_dir / f"{_BBDOWN_FILE_PATTERN}.mp4"
    if expected.is_file() and expected.stat().st_size > 0:
        return expected
    produced = _new_mp4_files(work_dir, before)
    if len(produced) == 1:
        return produced[0]
    if produced:
        raise VideoDownloadError(f"BBDown produced multiple mp4 files: {len(produced)}")
    raise VideoDownloadError("BBDown exited successfully but produced no mp4")


def _run_subprocess(cmd: list[str], *, timeout_s: int) -> None:
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
        start_new_session=True,
    )
    try:
        stdout, stderr = proc.communicate(timeout=timeout_s)
    except subprocess.TimeoutExpired as exc:
        _terminate_process_group(proc)
        stdout = _decode_timeout_output(exc.stdout)
        stderr = _decode_timeout_output(exc.stderr)
        detail = _format_process_output(stdout=stdout, stderr=stderr)
        raise VideoDownloadTimeoutError(
            f"BBDown timed out after {timeout_s}s{detail}"
        ) from exc
    if proc.returncode != 0:
        detail = _format_process_output(stdout=stdout, stderr=stderr)
        raise VideoDownloadError(f"BBDown exited with code {proc.returncode}{detail}")


def _terminate_process_group(proc: subprocess.Popen[str]) -> None:
    try:
        os.killpg(proc.pid, signal.SIGTERM)
        proc.wait(timeout=5)
    except Exception:  # noqa: BLE001 — best effort before hard kill
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except Exception:
            pass


def _resolve_executable(value: str, env_name: str) -> str:
    path = value.strip()
    if not path:
        raise VideoDownloadConfigError(f"{env_name} is not configured")
    if "/" in path:
        if not Path(path).is_file():
            raise VideoDownloadConfigError(f"{env_name} does not point to a file")
        return path
    resolved = shutil.which(path)
    if resolved is None:
        raise VideoDownloadConfigError(f"{env_name} executable was not found on PATH")
    return resolved


def _select_page(source_url: str) -> str:
    values = parse_qs(urlparse(source_url).query).get("p")
    if not values:
        return "1"
    try:
        page = int(values[0])
    except ValueError:
        return "1"
    return str(max(1, page))


def _mp4_files(directory: Path) -> set[Path]:
    if not directory.exists():
        return set()
    return {path.resolve() for path in directory.rglob("*.mp4") if path.is_file()}


def _new_mp4_files(directory: Path, before: set[Path]) -> list[Path]:
    return sorted(
        (
            path
            for path in _mp4_files(directory)
            if path not in before and path.stat().st_size > 0
        ),
        key=lambda path: str(path),
    )


def _normalize_error(exc: Exception, *, backend: str) -> VideoDownloadError:
    if isinstance(exc, VideoDownloadError):
        return exc
    return VideoDownloadError(f"{backend} failed: {_truncate(str(exc))}")


def _elapsed_ms(started: float) -> int:
    return max(0, int((time.perf_counter() - started) * 1000))


def _log_attempt(
    *,
    platform: str,
    backend: str,
    chapter_id: object | None,
    success: bool,
    latency_ms: int,
    error_type: str | None,
    error_detail: str | None,
) -> None:
    _log_event(
        "video_download_attempt",
        level="info" if success else "warning",
        platform=platform,
        backend=backend,
        chapter_id=str(chapter_id) if chapter_id is not None else None,
        success=success,
        latency_ms=latency_ms,
        error_type=error_type,
        error_detail=_truncate(_redact(error_detail)) if error_detail else None,
    )


def _log_event(name: str, *, level: str, **payload: object) -> None:
    clean_payload = {key: value for key, value in payload.items() if value is not None}
    message = json.dumps(clean_payload, ensure_ascii=False, default=str)
    if level == "warning":
        logger.warning("%s %s", name, message)
    else:
        logger.info("%s %s", name, message)


def _format_process_output(*, stdout: str | None, stderr: str | None) -> str:
    parts: list[str] = []
    if stderr:
        parts.append(f"stderr={_truncate(_redact(stderr))}")
    if stdout:
        parts.append(f"stdout={_truncate(_redact(stdout))}")
    if not parts:
        return ""
    return " (" + "; ".join(parts) + ")"


def _decode_timeout_output(value: str | bytes | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return value


def _truncate(value: str, *, limit: int = 800) -> str:
    if len(value) <= limit:
        return value
    return value[: limit - 3] + "..."


def _redact(value: str | None) -> str:
    if value is None:
        return ""
    redacted = value
    if settings.bbdown_cookie:
        redacted = redacted.replace(settings.bbdown_cookie, "[redacted-cookie]")
    redacted = re.sub(r"(SESSDATA=)[^;\s]+", r"\1[redacted]", redacted)
    redacted = re.sub(
        r"(access[_-]?token=)[^&;\s]+",
        r"\1[redacted]",
        redacted,
        flags=re.I,
    )
    return redacted
