"""Voice (L4 spoken agent) — isolated backend module.

This package is the *only* voice surface. It is mounted by api/v1/router.py
solely when `settings.voice_enabled` is True, so it adds zero attack surface
and zero import cost when the feature is off. It never touches the course
brain directly — it calls the existing `ai_client` facade (E3) and treats STT
/ TTS as swappable providers (E8: single vendor first, regional abstraction
later).
"""
