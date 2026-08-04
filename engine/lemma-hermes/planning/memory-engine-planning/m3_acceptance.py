"""M3 acceptance — LemmaHermes Memory Engine P2 (decision & scheduling).

Verifies W2.1 (router hint), W2.2 (due_reviews + cron job), W2.4 (session
rollup) plus regression on the M1 suites.

Usage:  python planning/memory-engine-planning/m3_acceptance.py
"""

from __future__ import annotations

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


def test_imports() -> None:
    print("== 1. module imports ==")
    for mod in (
        "agent.learner.learner_scheduler",
        "agent.learner.learner_router",
        "agent.learner.learner_core",
        "agent.learner.learner_injector",
    ):
        try:
            __import__(mod)
            check(mod, True)
        except Exception as e:  # pragma: no cover
            check(mod, False, str(e))


def test_w2_2_due(tmp: str) -> None:
    print("== 2. W2.2 due_reviews + due_summary ==")
    lc = LearnerCore(os.path.join(tmp, "l.db"))
    lc.upsert_concept("u1", "attention", tested=True, success=True)
    lc.enqueue_review("u1", "attention")

    r = lc.handle_action("u1", "due_reviews")
    check("due_reviews action", r["success"] and r["due"] and r["due"][0]["concept"] == "attention", str(r)[:120])
    check("due_summary text", "Concepts due for review" in r["summary"])
    r0 = lc.handle_action("u1", "due_reviews", limit=0)
    check("limit=0 honored", r0["success"] and r0["due"] == [])

    # schema exposes the action
    from agent.learner.learner_injector import LEARNER_STATE_SCHEMA

    check("schema enum has due_reviews", "due_reviews" in LEARNER_STATE_SCHEMA["parameters"]["properties"]["action"]["enum"])


def test_w2_2_cron(tmp: str) -> None:
    print("== 3. W2.2 cron review job (mock) ==")
    from unittest.mock import patch

    from agent.learner.learner_scheduler import maybe_sync_review_job, register_review_job, remove_review_job

    created: dict = {}

    class _FakeJobs:
        @staticmethod
        def create_job(**kw):
            created["job"] = kw
            return {"id": "j1", "name": kw["name"]}

        @staticmethod
        def list_jobs():
            return [{"id": "j1", "name": "learner-daily-review"}] if created else []

        @staticmethod
        def remove_job(job_id):
            created.pop("job", None)
            return True

    with patch.dict("sys.modules", {"cron.jobs": _FakeJobs}):
        # force re-import with patched cron.jobs
        import importlib

        import agent.learner.learner_scheduler as sched
        importlib.reload(sched)
        ok = sched.register_review_job(schedule="daily")
        check("register creates job", ok is not None and created["job"]["name"] == "learner-daily-review", str(ok))
        ok2 = sched.register_review_job(schedule="daily")
        check("register idempotent", ok2 is not None)
        sched.remove_review_job()
        check("remove clears job", "job" not in created)
        importlib.reload(sched)  # restore module with real cron.jobs import path


def test_w2_4_session(tmp: str) -> None:
    print("== 4. W2.4 session rollup ==")
    import sqlite3

    # standalone db (test_w2_2_due shares the same tmp dir + l.db filename)
    lc = LearnerCore(os.path.join(tmp, "l2.db"))
    lc.upsert_concept("u1", "attention", tested=True, success=True)
    lc.upsert_concept("u1", "attention", tested=True, success=False)  # mastery 0.5
    before = lc.get_concept("u1", "attention")["mastery"]
    assert before == 0.5, before
    n = lc.summarize_session("u1", "sess1", ["attention", "attention", "  "])
    after = lc.get_concept("u1", "attention")["mastery"]
    check("mastery NOT moved", before == after == 0.5, f"{before} -> {after}")
    check("dedup + blank filtered", n == 1, str(n))
    check("concepts_in_text", lc.concepts_in_text("u1", "explain attention again") == ["attention"])
    with sqlite3.connect(os.path.join(tmp, "l2.db")) as conn:
        ep = conn.execute("SELECT concept, result, reason FROM learning_episodes WHERE reason='session_end'").fetchall()
    check("partial session episode logged", len(ep) == 1 and ep[0][1] == "partial", str(ep))

    # wiring point present in run_agent.py
    src = open(os.path.join(ROOT, "run_agent.py"), encoding="utf-8").read()
    check("run_agent wiring", "summarize_session" in src and "concepts_in_text" in src)


def test_w2_1_router(tmp: str) -> None:
    print("== 5. W2.1 router hint ==")
    from agent.learner.learner_router import hint_for_tool, wrap_with_hint

    lc = LearnerCore(os.path.join(tmp, "l.db"))
    for _ in range(3):
        lc.record_method("u1", "attention", "visualization", success=True)
    lc.record_method("u1", "attention", "formula_first", success=False)
    lc.user_id = "u1"
    agent = SimpleNamespace(_learner=lc, _user_id="u1")

    h = hint_for_tool(agent, "paper_reader", {"query": "explain attention mechanism"})
    check("hint on concept match", "visualization" in h and "100%" in h, h)
    check("wrap prepends", wrap_with_hint("body", h).startswith("[Learner hint]"))
    check("no hint on unrelated", hint_for_tool(agent, "paper_reader", {"query": "unrelated topic"}) == "")
    check("disabled no-op", hint_for_tool(SimpleNamespace(_learner=None), "x", {}) == "")

    src = open(os.path.join(ROOT, "agent/agent_runtime_helpers.py"), encoding="utf-8").read()
    check("runtime wiring", "_learner_hint" in src and "hint_for_tool" in src)


def test_regression() -> None:
    print("== 6. M1 regression ==")
    import subprocess

    r = subprocess.run(
        [sys.executable, os.path.join(ROOT, "planning/memory-engine-planning/m1_acceptance.py")],
        capture_output=True, text=True,
    )
    check("m1_acceptance still green", "ALL PASSED" in r.stdout, r.stdout[-300:])


def main() -> None:
    tmp = tempfile.mkdtemp()
    test_imports()
    test_w2_2_due(tmp)
    test_w2_2_cron(tmp)
    test_w2_4_session(tmp)
    test_w2_1_router(tmp)
    test_regression()
    print()
    if FAILURES:
        print(f"M3 ACCEPTANCE: {len(FAILURES)} FAILURE(S): {FAILURES}")
        sys.exit(1)
    print("M3 ACCEPTANCE: ALL PASSED")


if __name__ == "__main__":
    main()
