"""Provider file lifecycle: platform-private ids + expiry management (终稿 8.3).

The Gemini Files API behind AiHubMix cannot LIST files (verified against
AiHubMix docs 2026-06-10), so Lemma's own records are the only ledger — a lost
file reference is a lost file. Files auto-delete after ~48h; expiry must be
checked before every reuse. Media lifecycle never moves into the framework.

TODO(file-cache-table): persistent provider-file cache table so ingested
videos can be reused across requests/sessions without re-uploading.
"""

from datetime import UTC, datetime, timedelta

from ai.errors import UnsupportedCapabilityError
from ai.native import gemini_video
from ai.types import VideoInput, VideoInputKind

PLATFORM_AIHUBMIX_GEMINI = "aihubmix_gemini"

# Don't send a file that expires mid-request.
_EXPIRY_SAFETY_MARGIN = timedelta(minutes=5)


def file_to_video_input(file) -> VideoInput:  # noqa: ANN001 — genai File, internal
    """Map a genai File to the boundary VideoInput (kind=PROVIDER_FILE_ID)."""
    return VideoInput(
        kind=VideoInputKind.PROVIDER_FILE_ID,
        url=file.uri,
        file_id=file.name,
        file_platform=PLATFORM_AIHUBMIX_GEMINI,
        mime_type=file.mime_type,
        expires_at=file.expiration_time,
    )


def is_expired(video: VideoInput, *, now: datetime | None = None) -> bool:
    if video.expires_at is None:
        return False
    now = now or datetime.now(UTC)
    return now >= (video.expires_at - _EXPIRY_SAFETY_MARGIN)


def ensure_usable(video: VideoInput) -> None:
    """Refuse cross-platform or expired file references (file_id 平台私有)."""
    if video.file_platform != PLATFORM_AIHUBMIX_GEMINI:
        raise UnsupportedCapabilityError(
            f"provider file belongs to '{video.file_platform}', "
            f"only '{PLATFORM_AIHUBMIX_GEMINI}' is supported"
        )
    if not video.url or not video.file_id:
        raise UnsupportedCapabilityError("provider file reference is incomplete")
    if is_expired(video):
        raise UnsupportedCapabilityError(
            "provider file has expired (~48h lifetime); re-ingest the video"
        )


async def upload_video(
    path: str,
    *,
    mime_type: str | None = None,
    fresh_client: bool = False,
) -> VideoInput:
    """Upload to the Gemini Files API and return a ready-to-use VideoInput.

    fresh_client=True builds and closes a dedicated client — required inside
    Celery tasks, which must not reuse the web process client (终稿 9.3).
    """
    if fresh_client:
        client = gemini_video.build_client()
        try:
            file = await gemini_video.upload_file(
                path, mime_type=mime_type, client=client
            )
        finally:
            await client.aio.aclose()
    else:
        file = await gemini_video.upload_file(path, mime_type=mime_type)
    return file_to_video_input(file)


async def delete_video(video: VideoInput) -> None:
    ensure_usable(video)
    await gemini_video.delete_file(video.file_id or "")
