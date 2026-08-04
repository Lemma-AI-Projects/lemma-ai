"""M1 acceptance — LemmaHermes Memory Engine P0 integration verification.

Runs WITHOUT a real LLM / full AIAgent:
  1. all learner modules import cleanly
  2. all three wiring files parse
  3. learner.db end-to-end state machine (identity → knowledge → episode
     feedback → patterns → rules → review queue → SM-2)
  4. wiring points exist in the three touched core files
  5. system-prompt stability: learner block is byte-stable within a session

Usage:  python planning/memory-engine-planning/m1_acceptance.py
"""

from __future__ import annotations

import os
import re
import sys
import tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, ROOT)

FAILURES: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    status = "PASS" if cond else "FAIL"
    print(f"  [{status}] {name}" + (f"  -- {detail}" if detail and not cond else ""))
    if not cond:
        FAILURES.append(name)


def test_imports() -> None:
    print("== 1. module imports ==")
    try:
        from agent.learner import LearnerCore, LEARNER_STATE_SCHEMA, inject_tools  # noqa: F401
        check("agent.learner package", True)
    except Exception as e:  # pragma: no cover
        check("agent.learner package", False, str(e))
        return
    for mod in (
        "agent.learner.learner_schema",
        "agent.learner.learner_core",
        "agent.learner.learner_injector",
        "agent.learner.learner_assess",
        "agent.learner.learner_scheduler",
        "agent.learner.learner_router",
        "agent.learner.learner_projection",
    ):
        try:
            __import__(mod)
            check(mod, True)
        except Exception as e:  # pragma: no cover
            check(mod, False, str(e))


def test_wiring_syntax() -> None:
    print("== 2. wiring files parse ==")
    import ast

    for f in (
        "agent/agent_init.py",
        "agent/system_prompt.py",
        "agent/turn_context.py",
        "agent/agent_runtime_helpers.py",
    ):
        try:
            ast.parse(open(os.path.join(ROOT, f), encoding="utf-8").read())
            check(f"parse {f}", True)
        except Exception as e:  # pragma: no cover
            check(f"parse {f}", False, str(e))


def test_wiring_points() -> None:
    print("== 3. wiring points present ==")
    src_init = open(os.path.join(ROOT, "agent/agent_init.py"), encoding="utf-8").read()
    src_sp = open(os.path.join(ROOT, "agent/system_prompt.py"), encoding="utf-8").read()
    src_tc = open(os.path.join(ROOT, "agent/turn_context.py"), encoding="utf-8").read()
    src_arh = open(os.path.join(ROOT, "agent/agent_runtime_helpers.py"), encoding="utf-8").read()
    src_br = open(os.path.join(ROOT, "agent/background_review.py"), encoding="utf-8").read()

    check("agent_init: _learner init", "agent._learner = _LearnerCore" in src_init)
    check("agent_init: inject_tools call", "_inject_learner_tools(agent)" in src_init)
    check("system_prompt: learner block", "_learner_block" in src_sp and "build_static_block" in src_sp)
    check("turn_context: learner prefetch", "_learner_ctx" in src_tc)
    check("runtime_helpers: learner_state branch", 'function_name == "learner_state"' in src_arh)
    check("agent_init: cognitive review prompt", "_COMBINED_REVIEW_PROMPT = _build_review_prompt()" in src_init)
    check("review fork inherits learner", "review_agent._learner = getattr(agent, \"_learner\", None)" in src_br)
    check("review whitelist adds learner_state", 'review_whitelist.add("learner_state")' in src_br)


def test_review_prompt() -> None:
    print("== 6. cognitive review prompt ==")
    from agent.learner.learner_assess import build_cognitive_review_prompt

    p = build_cognitive_review_prompt()
    check("prompt guides upsert_concept", "action=upsert_concept" in p)
    check("prompt guides record_episode", "action=record_episode" in p)
    check("prompt forbids asked==mastery", "exposed=true" in p and "demonstrated" in p and "mastery" in p)
    check("prompt keeps memory+skills", "**Memory**" in p and "**Skills**" in p)


def test_learner_db_e2e() -> None:
    print("== 4. learner.db end-to-end ==")
    import sqlite3

    from agent.learner.learner_core import LearnerCore

    db = os.path.join(tempfile.mkdtemp(), "learner.db")
    lc = LearnerCore(db)
    LearnerCore(db)  # idempotent re-open

    lc.upsert_identity("u1", goals=["become AI researcher"], interests=["agents"])
    assert lc.get_identity("u1")["goals"] == ["become AI researcher"]

    # exposed ≠ mastery
    lc.upsert_concept("u1", "attention", exposed=True)
    c = lc.get_concept("u1", "attention")
    check("exposed does not move mastery", c["attempts"] == 0 and c["mastery"] == 0.0, str(c))

    # 3 successes → mastery 1.0, confidence ~0.45
    for _ in range(3):
        lc.upsert_concept("u1", "attention", tested=True, success=True)
    c = lc.get_concept("u1", "attention")
    check("3 successes → mastery 1.0", c["mastery"] == 1.0, str(c))
    check("confidence in (0.4, 0.6)", 0.4 < c["confidence"] < 0.6, str(c["confidence"]))

    # 1 failure → 0.75
    lc.upsert_concept("u1", "attention", tested=True, success=False)
    check("failure lowers mastery", lc.get_concept("u1", "attention")["mastery"] == 0.75)

    # episode with feedback loop
    lc.record_episode(
        "u1", "understand attention", concept="attention", method="formula_first",
        result="failed", reason="too abstract", new_strategy="use visualization first",
    )
    check("episode lowers mastery below 0.75", lc.get_concept("u1", "attention")["mastery"] < 0.75)
    rules = lc.list_rules("u1")
    check("failed+strategy → hypothesis rule", any(
        r["rule"] == "use visualization first" and r["status"] == "hypothesis" for r in rules
    ), str(rules))

    lc.record_method("u1", "attention", "formula_first", success=False)
    pats = lc.top_patterns("u1", min_attempts=1)
    check("pattern recorded", any(p["method"] == "formula_first" for p in pats), str(pats))

    # review queue + SM-2
    lc.enqueue_review("u1", "attention")
    due = lc.get_due_reviews("u1")
    check("due review present", len(due) == 1 and due[0]["concept"] == "attention", str(due))
    with sqlite3.connect(db) as conn:
        node_id = conn.execute("SELECT node_id FROM knowledge_nodes WHERE concept='attention'").fetchone()[0]
    lc.reschedule_review("u1", node_id, success=True)
    with sqlite3.connect(db) as conn:
        rq = conn.execute("SELECT interval, ease FROM review_queue").fetchone()
    check("SM-2 success → interval 1, ease 2.6", rq[0] == 1 and abs(rq[1] - 2.6) < 1e-9, str(tuple(rq)))

    # rule promotion
    rid = next(r["rule_id"] for r in rules if r["rule"] == "use visualization first")
    for _ in range(5):
        lc.confirm_rule("u1", rid, hit=True)
    r = next(x for x in lc.list_rules("u1") if x["rule_id"] == rid)
    check("rule promoted to active", r["status"] == "active", str(r))

    # injection helpers
    lc.user_id = "u1"
    blk = lc.build_static_block()
    check("static block has <learner-state>", "<learner-state>" in blk)
    check("static block lists active rule", "Learning rules:" in blk)
    ctx = lc.prefetch_context("explain attention mechanism")
    check("prefetch matches concept", "<memory-context>" in ctx and "attention" in ctx)

    # tool handler
    r = lc.handle_action("u1", "query_knowledge")
    check("handle_action query_knowledge", r["success"] and r["knowledge"])
    r2 = lc.handle_action("u1", "upsert_concept", concept="transformer", success=True)
    check("handle_action upsert_concept", r2["success"] and r2["node"]["mastery"] == 1.0, str(r2))


def test_static_block_stability() -> None:
    print("== 5. static block byte-stability ==")
    from agent.learner.learner_core import LearnerCore

    db = os.path.join(tempfile.mkdtemp(), "learner.db")
    lc = LearnerCore(db)
    lc.user_id = "u1"
    a = lc.build_static_block()
    b = lc.build_static_block()
    check("two builds identical", a == b)


def main() -> None:
    test_imports()
    test_wiring_syntax()
    test_wiring_points()
    test_learner_db_e2e()
    test_static_block_stability()
    test_review_prompt()
    print()
    if FAILURES:
        print(f"M1 ACCEPTANCE: {len(FAILURES)} FAILURE(S): {FAILURES}")
        sys.exit(1)
    print("M1 ACCEPTANCE: ALL PASSED")


if __name__ == "__main__":
    main()
