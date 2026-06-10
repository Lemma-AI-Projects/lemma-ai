"""Video input resolution matrix — simplified per 最新决策 2 (Files API only).

| kind             | resolution                                              |
|------------------|---------------------------------------------------------|
| PROVIDER_FILE_ID | ready to ask — validate platform + expiry               |
| YOUTUBE_URL      | needs ingest (download -> Files API)                    |
| PUBLIC_URL       | needs ingest (yt-dlp download -> Files API)             |
| BASE64           | rejected — no inline bodies; upload via Files API first |

# TODO(youtube-direct): Gemini supports passing public YouTube URLs straight
# through file_data. When probed and approved, YOUTUBE_URL becomes "ready"
# here and skips the ingest pipeline entirely.
"""

from ai.errors import UnsupportedCapabilityError
from ai.media.provider_files import ensure_usable
from ai.types import VideoInput, VideoInputKind


def needs_ingest(video: VideoInput) -> bool:
    """True when the video must run through tasks/video_ingest.py first."""
    return video.kind in (VideoInputKind.YOUTUBE_URL, VideoInputKind.PUBLIC_URL)


def ensure_ready(video: VideoInput) -> None:
    """Validate that this input can be sent to the model right now."""
    if video.kind == VideoInputKind.PROVIDER_FILE_ID:
        ensure_usable(video)
        return
    if needs_ingest(video):
        raise UnsupportedCapabilityError(
            "video URLs must be ingested first (tasks/video_ingest.py returns "
            "a provider file reference); direct URL pass-through is not enabled"
        )
    if video.kind == VideoInputKind.BASE64:
        raise UnsupportedCapabilityError(
            "inline base64 video is disabled by policy — upload via the Files "
            "API (media/provider_files.upload_video) and pass the file reference"
        )
    raise UnsupportedCapabilityError(f"unsupported video input kind '{video.kind}'")
