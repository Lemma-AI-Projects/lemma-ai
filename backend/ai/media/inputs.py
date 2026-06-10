"""VideoInput construction helpers for callers outside ai/ (终稿 3: inputs.py).

services/ and tasks/ build VideoInput through these instead of hand-rolling
field combinations; the kind matrix lives in resolver.py.
"""

import re
from datetime import datetime

from ai.types import VideoInput, VideoInputKind

_YOUTUBE_RE = re.compile(
    r"^https?://(www\.)?(youtube\.com/(watch\?|shorts/|live/)|youtu\.be/)", re.IGNORECASE
)


def from_url(url: str) -> VideoInput:
    """Classify a public video URL (YouTube vs everything else, e.g. B站)."""
    kind = (
        VideoInputKind.YOUTUBE_URL
        if _YOUTUBE_RE.match(url)
        else VideoInputKind.PUBLIC_URL
    )
    return VideoInput(kind=kind, url=url)


def from_provider_file(
    *,
    file_id: str,
    file_uri: str,
    file_platform: str,
    mime_type: str | None = None,
    expires_at: datetime | None = None,
) -> VideoInput:
    """Rebuild a provider file reference, e.g. from a Celery ingest result."""
    return VideoInput(
        kind=VideoInputKind.PROVIDER_FILE_ID,
        url=file_uri,
        file_id=file_id,
        file_platform=file_platform,
        mime_type=mime_type,
        expires_at=expires_at,
    )
