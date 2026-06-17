"""Deterministic candidate ranking (no LLM).

Cheap, testable, observable: the LLM only makes the final pick among the top of
this ordering. Scores blend engagement (views, likes — log-scaled so a 10M-view
video doesn't dwarf everything), a duration sanity band (penalize shorts and
multi-hour compilations), and recency. Pure function of its inputs (and `now`,
injectable for tests).
"""

import math
from datetime import UTC, datetime

from ai.coursegen.types import ChapterPlan
from ai.search.types import VideoCandidate

# Weights (additive). Views dominate, duration fit is a strong secondary signal
# so a high-view 30-second short can't outrank a solid 15-minute lesson.
_W_VIEWS = 1.0
_W_LIKES = 0.5
_W_DURATION = 1.5
_W_RECENCY = 1.0

_DECAY_DAYS = 3650.0  # recency fades to 0 over ~10 years


def rank(
    candidates: list[VideoCandidate],
    chapter_plan: ChapterPlan,
    *,
    now: datetime | None = None,
) -> list[VideoCandidate]:
    """Return candidates sorted best-first. Stable (preserves input order on
    ties). chapter_plan is accepted for interface stability / future relevance
    signals; the current score is metric-only and deterministic."""
    del chapter_plan  # reserved; current scoring is purely metric-based
    moment = now or datetime.now(UTC)
    # enumerate index is the stable tiebreaker (Python sort is stable, but the
    # negative score key alone would reorder equal scores arbitrarily otherwise).
    return [
        candidate
        for _, candidate in sorted(
            enumerate(candidates),
            key=lambda pair: (-_score(pair[1], moment), pair[0]),
        )
    ]


def _score(candidate: VideoCandidate, now: datetime) -> float:
    views = math.log10((candidate.view_count or 0) + 1)
    likes = math.log10((candidate.like_count or 0) + 1)
    return (
        _W_VIEWS * views
        + _W_LIKES * likes
        + _W_DURATION * _duration_score(candidate.duration_s)
        + _W_RECENCY * _recency_score(candidate.published_at, now)
    )


def _duration_score(duration_s: int | None) -> float:
    if duration_s is None:
        return 0.5
    if duration_s < 120:  # shorts / clips: too thin for a chapter
        return 0.2
    if duration_s <= 2400:  # 2–40 min: the teaching sweet spot
        return 1.0
    if duration_s <= 7200:  # up to 2h: acceptable
        return 0.6
    return 0.3  # multi-hour compilation


def _recency_score(published_at: datetime | None, now: datetime) -> float:
    if published_at is None:
        return 0.5
    # YouTube dates parse naive, Bilibili epochs parse UTC-aware; normalize so
    # the subtraction never raises.
    moment = published_at if published_at.tzinfo else published_at.replace(tzinfo=UTC)
    days = (now - moment).days
    if days <= 0:
        return 1.0
    return max(0.0, 1.0 - days / _DECAY_DAYS)
