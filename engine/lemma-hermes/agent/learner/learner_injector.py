"""learner_injector — expose the learner_state tool to the model surface.

D6: ONE tool ``learner_state`` with an ``action`` enum (mirrors the built-in
memory tool's multi-action shape). The schema is appended to ``agent.tools``
and ``valid_tool_names`` in the same way ``inject_memory_provider_tools`` does
for external providers — but learner is a first-class core module, so it does
NOT go through the MemoryProvider channel (which would hit the one-external
limit and core-name protection).

This module only touches the tool surface. Dispatch is handled by
``LearnerCore.handle_action``.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

LEARNER_STATE_SCHEMA: Dict[str, Any] = {
    "name": "learner_state",
    "description": (
        "Update or query the user's learner state: knowledge mastery, "
        "learning patterns, episodes, teaching rules. Call it AFTER the user "
        "demonstrates understanding (upsert_concept success=true), fails or "
        "gets stuck (record_episode result=failed + reason + new_strategy), "
        "or when you need to check what concepts need review. NEVER record "
        "'user asked about X' as mastery — only demonstrated understanding "
        "counts as a test."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": [
                    "upsert_concept",
                    "record_episode",
                    "query_knowledge",
                    "add_rule",
                    "due_reviews",
                ],
                "description": "Which learner-state operation to run.",
            },
            "concept": {
                "type": "string",
                "description": "Concept name, e.g. 'attention' (upsert_concept / record_episode).",
            },
            "success": {
                "type": "boolean",
                "description": "True if the user demonstrated understanding (upsert_concept).",
            },
            "exposed": {
                "type": "boolean",
                "description": "True if the concept was taught but NOT tested (upsert_concept).",
            },
            "goal": {
                "type": "string",
                "description": "Learning goal for the episode (record_episode).",
            },
            "plugin": {
                "type": "string",
                "description": "Tool/plugin used, e.g. 'paper-reader' (record_episode).",
            },
            "method": {
                "type": "string",
                "description": "Teaching method used, e.g. 'visualization', 'formula_first' (record_episode).",
            },
            "result": {
                "type": "string",
                "enum": ["success", "failed", "partial"],
                "description": "Outcome of the learning episode.",
            },
            "reason": {
                "type": "string",
                "description": "Why it failed, e.g. 'too abstract' (record_episode result=failed).",
            },
            "new_strategy": {
                "type": "string",
                "description": "Strategy to try next time (record_episode result=failed).",
            },
            "concepts": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Concept filter for query_knowledge.",
            },
            "rule": {
                "type": "string",
                "description": "Teaching rule to record (add_rule).",
            },
        },
        "required": ["action"],
    },
}


def inject_tools(agent: Any) -> int:
    """Append the learner_state tool to the agent's tool surface.

    Returns the number of tools added (0 when learner is not wired or the
    tool already exists). Safe no-op for ``agent._learner is None``.
    """
    learner = getattr(agent, "_learner", None)
    tools = getattr(agent, "tools", None)
    if learner is None or tools is None:
        return 0
    existing = {
        t.get("function", {}).get("name")
        for t in tools
        if isinstance(t, dict) and isinstance(t.get("function"), dict)
    }
    if "learner_state" in existing:
        return 0
    tools.append({"type": "function", "function": LEARNER_STATE_SCHEMA})
    valid = getattr(agent, "valid_tool_names", None)
    if valid is None:
        valid = set()
        agent.valid_tool_names = valid
    valid.add("learner_state")
    return 1


def handle_learner_tool(agent: Any, args: Dict[str, Any]) -> str:
    """Handler for the learner_state tool (called by the tool dispatcher).

    Wired in W0.8; returns a JSON string exactly like other tools.
    """
    import json

    learner = getattr(agent, "_learner", None)
    if learner is None:
        return json.dumps({"success": False, "error": "learner not enabled"})
    user_id = getattr(agent, "_user_id", None) or getattr(learner, "user_id", "default")
    action = str(args.get("action") or "")
    result = learner.handle_action(user_id, action, **{k: v for k, v in args.items() if k != "action"})
    return json.dumps(result, ensure_ascii=False, default=str)
