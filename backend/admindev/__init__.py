"""Dev dashboard (/admindev) — developer-only ops panel.

Monitor / component control / live architecture / dev message board.
Gated by settings.dev_dashboard_enabled; routers are only mounted when enabled
so a disabled dashboard has zero attack surface.
"""
