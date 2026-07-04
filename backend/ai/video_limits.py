"""Video token-limit policy for the Gemini channel (7-3 aihubmix 工单结论).

Provider-confirmed numbers: a video costs ~263 tokens/second at the default
(medium) media resolution and ~100 tokens/second at low; a single request's
input must stay under 1,048,576 tokens or the upstream returns a deterministic
400 (retrying is pointless). Two policy decisions live here so compose,
overview and companion all agree:

- SELECTION: candidates longer than `MAX_CANDIDATE_DURATION_S` can never fit a
  request even at low resolution (leaving headroom for prompt + history), so
  compose must not pick them at all.
- RESOLUTION: chapters longer than `LOW_RESOLUTION_THRESHOLD_S` must be sent at
  low media resolution (50min × 263 ≈ 790K already flirts with the cap; low
  drops it ~2.6×, which also slashes prefill latency past the gateway's ~60s
  streaming cutoff). The choice must stay constant across a chapter's turns or
  implicit context caching misses (见 plan 2.5).
"""

# ~150 min: 9000s × 100 tok/s = 900K, leaving ~148K headroom for prompt/output
# under the 1,048,576 hard cap even at LOW resolution.
MAX_CANDIDATE_DURATION_S = 150 * 60

# Above ~50 min the default (medium, ~263 tok/s) resolution approaches the cap;
# switch the whole chapter to low.
LOW_RESOLUTION_THRESHOLD_S = 50 * 60


def media_resolution_for_duration(duration_s: int | None) -> str | None:
    """Route-extra override for a chapter of the given duration.

    None -> keep the route's configured default (medium). Unknown duration keeps
    the default too: rejecting it here would break every candidate whose search
    provider didn't report a duration, and the 400 preflight already excluded
    known-oversized videos at selection time.
    """
    if duration_s is not None and duration_s > LOW_RESOLUTION_THRESHOLD_S:
        return "low"
    return None


def fits_token_limit(duration_s: int | None) -> bool:
    """Selection preflight: can this candidate EVER fit a generate request?

    Unknown durations pass (benefit of the doubt — see above).
    """
    return duration_s is None or duration_s <= MAX_CANDIDATE_DURATION_S
