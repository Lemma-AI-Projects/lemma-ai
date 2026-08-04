"""learner_router — deterministic per-tool teaching hints (W2.1).

When the model calls a tool whose args mention a concept the user has a
high-confidence learning preference for, prefix a one-line hint to the tool
result. Turns Layer-3 patterns into deterministic behavior instead of prompt
soft-constraints.
"""
from __future__ import annotations
import re
from typing import Any, Dict

MIN_SUCCESS_RATE = 0.70
MIN_ATTEMPTS = 3
_SPLIT_RE = re.compile(r"[\s,;.:!?()\[\]{}<>/\\\-_]+")


def hint_for_tool(agent: Any, tool_name: str, args: Dict[str, Any]) -> str:
    """Return a personalized teaching hint for this tool call, or ''."""
    learner = getattr(agent, "_learner", None)
    if learner is None or not tool_name:
        return ""
    user_id = getattr(agent, "_user_id", None) or getattr(learner, "user_id", "default")
    patterns = learner.top_patterns(user_id, limit=50, min_attempts=MIN_ATTEMPTS)
    candidates = [p for p in patterns if (p.get("success_rate") or 0) >= MIN_SUCCESS_RATE]
    if not candidates:
        return ""
    arg_text = " ".join(str(v) for v in args.values())
    arg_tokens = {t.lower() for t in _SPLIT_RE.split(arg_text) if len(t) >= 2}
    hits = []
    for p in candidates:
        c = (p.get("concept") or "").lower()
        if c in arg_tokens or any(t in c or c in t for t in arg_tokens):
            hits.append(p)
    if not hits:
        return ""
    best = max(hits, key=lambda p: p["success_rate"])
    rate = int(round(best["success_rate"] * 100))
    return (
        f"[Learner hint] For '{best['concept']}', method '{best['method']}' "
        f"worked best for this user ({rate}% over {best['attempts']} tries). "
        "Prefer it unless there's a reason not to."
    )


def wrap_with_hint(result: str, hint: str) -> str:
    return f"{hint}\n\n{result}" if hint else result
