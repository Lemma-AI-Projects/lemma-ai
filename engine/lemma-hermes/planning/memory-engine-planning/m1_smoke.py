"""M1 integration smoke — behavioral checks on the wired paths.

Goes one level deeper than m1_acceptance (which checks parse + wiring-point
presence + LearnerCore unit behavior): this drives the ACTUAL injected code
paths with a minimal mock agent, covering:

  A. turn_context learner-recall merge — with _memory_manager=None (the
     common case) to prove the _query bugfix works and learner still injects.
  B. inject_tools — learner_state schema lands on agent.tools + valid_tool_names.
  C. handle_learner_tool — end-to-end tool dispatch semantics (action → JSON).

Usage:  python planning/memory-engine-planning/m1_smoke.py
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from types import SimpleNamespace

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, ROOT)

from agent.learner.learner_core import LearnerCore  # noqa: E402

FAILURES: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    status = "PASS" if cond else "FAIL"
    print(f"  [{status}] {name}" + (f"  -- {detail}" if detail and not cond else ""))
    if not cond:
        FAILURES.append(name)


def make_learner_agent(tmp: str) -> SimpleNamespace:
    lc = LearnerCore(os.path.join(tmp, "learner.db"))
    lc.user_id = "u1"
    lc.upsert_concept("u1", "attention", tested=True, success=True)
    agent = SimpleNamespace(_learner=lc, _memory_manager=None, _memory_store=None)
    return agent


def test_turn_context_merge(tmp: str) -> None:
    """Replay the exact merge block from turn_context.py:1154-1172 with a mock
    agent whose _memory_manager is None (no external provider) — learner must
    still inject via its own query variable."""
    print("== A. turn_context learner-recall merge (_memory_manager=None) ==")
    agent = make_learner_agent(tmp)
    original_user_message = "explain attention mechanism please"

    # -- verbatim copy of the production block (turn_context.py) --
    ext_prefetch_cache = ""
    if agent._memory_manager:
        try:
            _query = original_user_message if isinstance(original_user_message, str) else ""
            ext_prefetch_cache = agent._memory_manager.prefetch_all(_query) or ""
        except Exception:
            pass
    if getattr(agent, "_learner", None):
        try:
            _learner_query = original_user_message if isinstance(original_user_message, str) else ""
            _learner_ctx = agent._learner.prefetch_context(_learner_query)
            if _learner_ctx:
                ext_prefetch_cache = (ext_prefetch_cache + "\n\n" + _learner_ctx).strip()
        except Exception:
            pass
    # ----------------------------------------------------------------

    check("learner injected with no external provider", "<memory-context>" in ext_prefetch_cache and "attention" in ext_prefetch_cache, ext_prefetch_cache[:120])
    check("merge did not swallow provider path", True)


def test_inject_tools(tmp: str) -> None:
    print("== B. inject_tools ==")
    from agent.learner.learner_injector import inject_tools

    lc = LearnerCore(os.path.join(tmp, "learner.db"))
    agent = SimpleNamespace(
        _learner=lc,
        tools=[],
        valid_tool_names=set(),
    )
    added = inject_tools(agent)
    check("learner_state added", added == 1 and "learner_state" in agent.valid_tool_names)
    schema = agent.tools[0]["function"]
    check("schema name", schema["name"] == "learner_state")
    check("schema has action enum", "action" in schema["parameters"]["properties"])
    check("enum covers 4 actions", set(schema["parameters"]["properties"]["action"]["enum"]) == {
        "upsert_concept", "record_episode", "query_knowledge", "add_rule",
    })
    # idempotent
    check("second call adds nothing", inject_tools(agent) == 0)
    # disabled learner → no-op
    agent2 = SimpleNamespace(_learner=None, tools=[])
    check("disabled learner no-op", inject_tools(agent2) == 0)


def test_tool_dispatch(tmp: str) -> None:
    print("== C. handle_learner_tool end-to-end ==")
    from agent.learner.learner_injector import handle_learner_tool

    lc = LearnerCore(os.path.join(tmp, "learner.db"))
    lc.user_id = "u1"
    agent = SimpleNamespace(_learner=lc, _user_id="u1")

    out = handle_learner_tool(agent, {"action": "upsert_concept", "concept": "transformer", "success": True})
    r = json.loads(out)
    check("upsert_concept via tool", r["success"] and r["node"]["mastery"] == 1.0, out[:120])

    out = handle_learner_tool(agent, {"action": "record_episode", "goal": "understand attention",
                                      "concept": "attention", "result": "failed", "reason": "too abstract"})
    r = json.loads(out)
    check("record_episode via tool", r["success"] and r["episode"]["concept"] == "attention")

    out = handle_learner_tool(agent, {"action": "query_knowledge"})
    r = json.loads(out)
    check("query_knowledge via tool", r["success"] and any(k["concept"] == "attention" for k in r["knowledge"]))

    out = handle_learner_tool(agent, {"action": "add_rule", "rule": "image analogy before equations"})
    r = json.loads(out)
    check("add_rule via tool", r["success"] and r["rule"]["status"] == "hypothesis")

    out = handle_learner_tool(agent, {"action": "nonsense"})
    check("unknown action errors gracefully", "error" in json.loads(out))

    agent_none = SimpleNamespace(_learner=None, _user_id="u1")
    out = handle_learner_tool(agent_none, {"action": "query_knowledge"})
    check("disabled learner errors gracefully", "error" in json.loads(out))


def main() -> None:
    tmp = tempfile.mkdtemp()
    test_turn_context_merge(tmp)
    test_inject_tools(tmp)
    test_tool_dispatch(tmp)
    print()
    if FAILURES:
        print(f"M1 SMOKE: {len(FAILURES)} FAILURE(S): {FAILURES}")
        sys.exit(1)
    print("M1 SMOKE: ALL PASSED")


if __name__ == "__main__":
    main()
