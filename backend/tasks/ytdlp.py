"""Compatibility exports for the historical yt-dlp download primitive.

The implementation moved to tasks.video_source_download so Bilibili can route
through BBDown while existing callers can keep importing download_to_mp4.
"""

from tasks.video_source_download import download_to_mp4

__all__ = ["download_to_mp4"]
