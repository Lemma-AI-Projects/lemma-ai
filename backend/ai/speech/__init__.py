"""Speech (TTS) — the delivery layer's audio source.

Not an LLM, and deliberately **not** on the AI routing table (voice-v0 plan §2.1):
`ModelRoute` describes `(platform, adapter) -> pydantic-ai Model`, while speech is
`text -> audio bytes`; the two share no semantics, and `ai/config.py`'s
`validate_routes()` rejects unknown channels at startup. So speech reuses the
AiHubMix credential + base URL directly and keeps its own (tiny) provider seam
here — a second provider or a fallback chain belongs inside this package, not in
the routing layer.
"""

from ai.speech.service import synthesize

__all__ = ["synthesize"]