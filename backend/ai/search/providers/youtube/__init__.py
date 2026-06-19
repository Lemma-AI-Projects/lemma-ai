"""YouTube search provider via yt-dlp (self-built, free, no key).

yt-dlp is imported only inside this package (provider.py); the rest of
ai/search/ sees YtDlpYouTubeProvider and the boundary VideoCandidate.
"""

from ai.search.providers.youtube.provider import YtDlpYouTubeProvider, to_candidate

__all__ = ["YtDlpYouTubeProvider", "to_candidate"]
