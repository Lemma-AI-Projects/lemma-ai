"""learner_core — the five-layer learner state model.

Pure stdlib. ``LearnerCore`` owns learner.db and exposes every operation the
plan needs:

  L1  identity            who the user is (goals / interests / background)
  L2  knowledge_nodes     mastery/confidence per concept (+ edges)
  L3  learning_patterns   which teaching method works for this user
  L4  learning_episodes   goal/plugin/method/result/reason/new_strategy
  L5  meta_rules          teaching rules with a confirm/refute lifecycle
  +   review_queue        spaced-repetition schedule (SM-2 simplified)

All operations take ``user_id`` explicitly — there is no global-context
default, so gateway multi-user sessions can never bleed state across users.

Invariants
----------
* mastery/confidence are recomputed (not incremented) from counts, so no
  floating-point drift.
* ``exposed`` (was-taught) never moves mastery — only ``tested`` does.
* episode feedback is applied inside the same transaction as the episode
  insert (atomicity: no half-updated learner state).
"""

from __future__ import annotations

import json
import math
import re
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterator, List, Optional

from agent.learner.learner_schema import migrate

# Mastery model: mastery = successes/attempts (Beta posterior mean),
# confidence = 1 - exp(-attempts / CONFIDENCE_SCALE). 5 tests -> ~0.63,
# 10 tests -> ~0.86. A larger delta is applied per test than holographic's
# trust deltas because one test carries more cognitive information than one
# retrieval event.
CONFIDENCE_SCALE = 5.0

# SM-2 simplified bounds
EASE_MIN = 1.3
EASE_MAX = 2.8
EASE_STEP_UP = 0.1
EASE_STEP_DOWN = 0.2

# Rule promotion thresholds (evidence count before status flips)
RULE_MIN_EVIDENCE = 5

# Prompt-injection hardening: learner content is model-authored and later
# injected into prompts (static tier + prefetch). Strip fence/context tags to
# prevent nested-fence smuggling (the same class of issue Hermes' memory
# tool guards against with _scan_memory_content), and cap field length so a
# runaway write cannot bloat the prompt budget.
_TAG_RE = re.compile(r"</?\s*(?:memory-context|learner-state)\s*>", re.IGNORECASE)
_MAX_FIELD_CHARS = 2000


def _sanitize_field(text: str) -> str:
    return _TAG_RE.sub("", text or "").strip()[: _MAX_FIELD_CHARS]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class LearnerCore:
    """State model + storage for the five-layer learner state."""

    def __init__(self, db_path: str) -> None:
        self._db_path = str(db_path)
        # Set by agent wiring (W0.5). Used as the default scope for the
        # injection helpers; every explicit API still requires user_id.
        self.user_id: str = "default"
        migrate(self._db_path)

    # -- connection ---------------------------------------------------------

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self._db_path, timeout=5.0)
        try:
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA busy_timeout=5000")
            conn.execute("PRAGMA foreign_keys=ON")
            yield conn
            conn.commit()
        finally:
            conn.close()

    # -- L1 identity --------------------------------------------------------

    def get_identity(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM identity WHERE user_id = ?", (user_id,)
            ).fetchone()
        if row is None:
            return None
        d = dict(row)
        d["goals"] = json.loads(d.get("goals") or "[]")
        d["interests"] = json.loads(d.get("interests") or "[]")
        return d

    def upsert_identity(
        self,
        user_id: str,
        *,
        goals: Optional[List[str]] = None,
        interests: Optional[List[str]] = None,
        background: Optional[str] = None,
    ) -> Dict[str, Any]:
        with self._connect() as conn:
            existing = conn.execute(
                "SELECT goals, interests, background, version FROM identity WHERE user_id = ?",
                (user_id,),
            ).fetchone()
            if existing is not None:
                if goals is None:
                    goals = json.loads(existing["goals"] or "[]")
                if interests is None:
                    interests = json.loads(existing["interests"] or "[]")
                if background is None:
                    background = existing["background"] or ""
                version = int(existing["version"]) + 1
            else:
                goals = goals or []
                interests = interests or []
                background = background or ""
                version = 1
            conn.execute(
                "INSERT INTO identity(user_id, goals, interests, background, version, updated_at) "
                "VALUES(?,?,?,?,?,?) "
                "ON CONFLICT(user_id) DO UPDATE SET "
                "goals=excluded.goals, interests=excluded.interests, "
                "background=excluded.background, version=excluded.version, updated_at=excluded.updated_at",
                (
                    user_id,
                    json.dumps(goals, ensure_ascii=False),
                    json.dumps(interests, ensure_ascii=False),
                    background,
                    version,
                    _now(),
                ),
            )
        return self.get_identity(user_id)  # type: ignore[return-value]

    # -- L2 knowledge -------------------------------------------------------

    def _resolve_concept(
        self, conn: sqlite3.Connection, user_id: str, concept: str, domain: str
    ) -> int:
        """Upsert a concept row (empty stats) and return its node_id."""
        cur = conn.execute(
            "INSERT INTO knowledge_nodes(user_id, concept, domain, source) "
            "VALUES(?,?,?,'') "
            "ON CONFLICT(user_id, concept, domain) DO UPDATE SET "
            "domain=excluded.domain "
            "RETURNING node_id",
            (user_id, concept, domain),
        )
        row = cur.fetchone()
        return int(row["node_id"])

    def upsert_concept(
        self,
        user_id: str,
        concept: str,
        *,
        domain: str = "general",
        tested: bool = False,
        success: Optional[bool] = None,
        exposed: bool = False,
        source: str = "",
    ) -> Dict[str, Any]:
        """Record a learning observation on a concept.

        tested=True moves mastery (success/failure on a test); exposed=True
        only updates ``last_exposed`` (being taught is NOT mastery).
        """
        if tested and success is None:
            raise ValueError("tested=True requires success=<bool>")
        now = _now()
        with self._connect() as conn:
            node_id = self._resolve_concept(conn, user_id, concept, domain)
            row = conn.execute(
                "SELECT mastery, confidence, attempts, successes, last_test, last_exposed, source "
                "FROM knowledge_nodes WHERE node_id = ?",
                (node_id,),
            ).fetchone()
            attempts = int(row["attempts"])
            successes = int(row["successes"])
            if tested:
                attempts += 1
                if success:
                    successes += 1
            mastery = successes / attempts if attempts > 0 else 0.0
            confidence = 1.0 - math.exp(-attempts / CONFIDENCE_SCALE)
            last_test = now if tested else row["last_test"]
            last_exposed = now if exposed else row["last_exposed"]
            src = source or (row["source"] or "")
            conn.execute(
                "UPDATE knowledge_nodes SET mastery=?, confidence=?, attempts=?, "
                "successes=?, last_test=?, last_exposed=?, source=? WHERE node_id=?",
                (
                    mastery,
                    confidence,
                    attempts,
                    successes,
                    last_test,
                    last_exposed,
                    src,
                    node_id,
                ),
            )
        return self.get_concept(user_id, concept, domain)  # type: ignore[return-value]

    def get_concept(
        self, user_id: str, concept: str, domain: str = "general"
    ) -> Optional[Dict[str, Any]]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM knowledge_nodes WHERE user_id=? AND concept=? AND domain=?",
                (user_id, concept, domain),
            ).fetchone()
        return dict(row) if row is not None else None

    def get_knowledge(
        self,
        user_id: str,
        concepts: Optional[List[str]] = None,
        domain: Optional[str] = None,
        limit: int = 20,
        min_confidence: float = 0.0,
    ) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM knowledge_nodes WHERE user_id = ?"
        args: List[Any] = [user_id]
        if concepts:
            marks = ",".join("?" * len(concepts))
            sql += f" AND concept IN ({marks})"
            args.extend(concepts)
        if domain:
            sql += " AND domain = ?"
            args.append(domain)
        sql += " AND confidence >= ?"
        args.append(min_confidence)
        sql += " ORDER BY mastery ASC, last_test DESC LIMIT ?"
        args.append(limit)
        with self._connect() as conn:
            rows = conn.execute(sql, args).fetchall()
        return [dict(r) for r in rows]

    def add_knowledge_edge(
        self, user_id: str, parent: str, child: str, weight: float = 0.5
    ) -> None:
        with self._connect() as conn:
            p = self._resolve_concept(conn, user_id, parent, "general")
            c = self._resolve_concept(conn, user_id, child, "general")
            conn.execute(
                "INSERT INTO knowledge_edges(user_id, parent, child, weight) "
                "VALUES(?,?,?,?) ON CONFLICT(user_id, parent, child) DO UPDATE SET weight=excluded.weight",
                (user_id, p, c, weight),
            )

    # -- L3 learning patterns ------------------------------------------------

    def record_method(
        self, user_id: str, concept: str, method: str, success: bool
    ) -> Dict[str, Any]:
        now = _now()
        with self._connect() as conn:
            row = conn.execute(
                "SELECT attempts, successes FROM learning_patterns "
                "WHERE user_id=? AND concept=? AND method=?",
                (user_id, concept, method),
            ).fetchone()
            attempts = int(row["attempts"]) + 1 if row else 1
            successes = (int(row["successes"]) + (1 if success else 0)) if row else (1 if success else 0)
            success_rate = successes / attempts if attempts > 0 else 0.5
            conn.execute(
                "INSERT INTO learning_patterns(user_id, concept, method, attempts, successes, success_rate, last_used) "
                "VALUES(?,?,?,?,?,?,?) "
                "ON CONFLICT(user_id, concept, method) DO UPDATE SET "
                "attempts=excluded.attempts, successes=excluded.successes, "
                "success_rate=excluded.success_rate, last_used=excluded.last_used",
                (user_id, concept, method, attempts, successes, success_rate, now),
            )
            row = conn.execute(
                "SELECT * FROM learning_patterns WHERE user_id=? AND concept=? AND method=?",
                (user_id, concept, method),
            ).fetchone()
        return dict(row)  # type: ignore[arg-type]

    def top_patterns(
        self, user_id: str, limit: int = 5, min_attempts: int = 3
    ) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM learning_patterns WHERE user_id=? AND attempts >= ? "
                "ORDER BY success_rate DESC, attempts DESC LIMIT ?",
                (user_id, min_attempts, limit),
            ).fetchall()
        return [dict(r) for r in rows]

    # -- L4 episodes (with feedback loop) ------------------------------------

    def record_episode(
        self,
        user_id: str,
        goal: str,
        *,
        concept: str = "",
        session_id: str = "",
        plugin: str = "",
        method: str = "",
        result: str = "partial",
        reason: str = "",
        new_strategy: str = "",
        messages_ref: str = "",
    ) -> Dict[str, Any]:
        """Insert a learning episode and apply its feedback to L2/L3/L5 and
        the review queue inside the same transaction."""
        result = result if result in ("success", "failed", "partial") else "partial"
        now = _now()
        with self._connect() as conn:
            cur = conn.execute(
                "INSERT INTO learning_episodes(user_id, session_id, goal, concept, plugin, method, "
                "result, reason, new_strategy, messages_ref, created_at) "
                "VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                (
                    user_id,
                    session_id,
                    goal,
                    concept,
                    plugin,
                    method,
                    result,
                    reason,
                    new_strategy,
                    messages_ref,
                    now,
                ),
            )
            episode_id = int(cur.lastrowid)
            # Feedback: L2 mastery (only when a concept is identified AND the
            # episode carries a test signal). 'partial' means "no test" — it
            # must NOT move mastery (a non-test must never look like a
            # failure). Only stamp last_exposed and skip all feedback.
            if concept:
                node_id = self._resolve_concept(conn, user_id, concept, "general")
                if result == "partial":
                    conn.execute(
                        "UPDATE knowledge_nodes SET last_exposed=? WHERE node_id=?",
                        (now, node_id),
                    )
                else:
                    tested_success = result == "success"
                    row = conn.execute(
                        "SELECT mastery, confidence, attempts, successes FROM knowledge_nodes WHERE node_id=?",
                        (node_id,),
                    ).fetchone()
                    attempts = int(row["attempts"]) + 1
                    successes = int(row["successes"]) + (1 if tested_success else 0)
                    mastery = successes / attempts if attempts > 0 else 0.0
                    confidence = 1.0 - math.exp(-attempts / CONFIDENCE_SCALE)
                    conn.execute(
                        "UPDATE knowledge_nodes SET mastery=?, confidence=?, attempts=?, "
                        "successes=?, last_test=? WHERE node_id=?",
                        (mastery, confidence, attempts, successes, now, node_id),
                    )
                    # L3: method outcome
                    if method:
                        p_row = conn.execute(
                            "SELECT attempts, successes FROM learning_patterns "
                            "WHERE user_id=? AND concept=? AND method=?",
                            (user_id, concept, method),
                        ).fetchone()
                        p_attempts = (int(p_row["attempts"]) + 1) if p_row else 1
                        p_successes = (
                            (int(p_row["successes"]) + (1 if tested_success else 0))
                            if p_row
                            else (1 if tested_success else 0)
                        )
                        conn.execute(
                            "INSERT INTO learning_patterns(user_id, concept, method, attempts, successes, success_rate, last_used) "
                            "VALUES(?,?,?,?,?,?,?) "
                            "ON CONFLICT(user_id, concept, method) DO UPDATE SET "
                            "attempts=excluded.attempts, successes=excluded.successes, "
                            "success_rate=excluded.success_rate, last_used=excluded.last_used",
                            (
                                user_id,
                                concept,
                                method,
                                p_attempts,
                                p_successes,
                                p_successes / p_attempts if p_attempts else 0.5,
                                now,
                            ),
                        )
                    # Review queue: reschedule on test outcome
                    q_row = conn.execute(
                        "SELECT ease, interval FROM review_queue WHERE user_id=? AND node_id=?",
                        (user_id, node_id),
                    ).fetchone()
                    if q_row is not None:
                        ease = float(q_row["ease"])
                        interval = int(q_row["interval"])
                        if tested_success:
                            new_interval = max(int(interval * ease), 1)
                            new_ease = min(ease + EASE_STEP_UP, EASE_MAX)
                        else:
                            new_interval = 0
                            new_ease = max(ease - EASE_STEP_DOWN, EASE_MIN)
                        conn.execute(
                            "UPDATE review_queue SET ease=?, interval=?, due=?, last_review=? "
                            "WHERE user_id=? AND node_id=?",
                            (
                                new_ease,
                                new_interval,
                                (datetime.now(timezone.utc) + timedelta(days=new_interval)).isoformat(timespec="seconds"),
                                now,
                                user_id,
                                node_id,
                            ),
                        )
                    # L5: failure with a new strategy spawns a hypothesis rule
                    if result == "failed" and new_strategy:
                        conn.execute(
                            "INSERT INTO meta_rules(user_id, rule, evidence, domain, source, status, created_at) "
                            "VALUES(?,?,1,'teaching','episode','hypothesis',?)",
                            (user_id, new_strategy, now),
                        )
            row = conn.execute(
                "SELECT * FROM learning_episodes WHERE episode_id=?", (episode_id,)
            ).fetchone()
        return dict(row)  # type: ignore[arg-type]

    # -- L5 meta rules -------------------------------------------------------

    def add_rule(
        self,
        user_id: str,
        rule: str,
        *,
        domain: str = "teaching",
        source: str = "manual",
    ) -> Dict[str, Any]:
        now = _now()
        with self._connect() as conn:
            cur = conn.execute(
                "INSERT INTO meta_rules(user_id, rule, evidence, domain, source, status, created_at) "
                "VALUES(?,?,1,?,?,'hypothesis',?)",
                (user_id, rule, domain, source, now),
            )
            rule_id = int(cur.lastrowid)
            row = conn.execute(
                "SELECT * FROM meta_rules WHERE rule_id=?", (rule_id,)
            ).fetchone()
        return dict(row)  # type: ignore[arg-type]

    def list_rules(
        self, user_id: str, status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM meta_rules WHERE user_id=?"
        args: List[Any] = [user_id]
        if status:
            sql += " AND status=?"
            args.append(status)
        sql += " ORDER BY confirmed DESC, created_at DESC"
        with self._connect() as conn:
            rows = conn.execute(sql, args).fetchall()
        return [dict(r) for r in rows]

    def confirm_rule(self, user_id: str, rule_id: int, hit: bool) -> None:
        """Register a rule outcome; promote/retire when evidence is sufficient."""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT confirmed, refuted, status FROM meta_rules WHERE user_id=? AND rule_id=?",
                (user_id, rule_id),
            ).fetchone()
            if row is None:
                return
            confirmed = int(row["confirmed"]) + (1 if hit else 0)
            refuted = int(row["refuted"]) + (0 if hit else 1)
            total = confirmed + refuted
            status = row["status"] if row["status"] else "hypothesis"
            if total >= RULE_MIN_EVIDENCE:
                if refuted > confirmed * 2:
                    status = "retired"
                elif confirmed >= refuted * 3:
                    status = "active"
            conn.execute(
                "UPDATE meta_rules SET confirmed=?, refuted=?, status=? WHERE user_id=? AND rule_id=?",
                (confirmed, refuted, status, user_id, rule_id),
            )

    # -- review queue --------------------------------------------------------

    def get_due_reviews(
        self, user_id: str, now: Optional[str] = None, limit: int = 5
    ) -> List[Dict[str, Any]]:
        now = now or _now()
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT rq.*, n.concept, n.domain, n.mastery FROM review_queue rq "
                "JOIN knowledge_nodes n ON n.node_id = rq.node_id "
                "WHERE rq.user_id=? AND (rq.due IS NULL OR rq.due <= ?) "
                "ORDER BY rq.due ASC LIMIT ?",
                (user_id, now, limit),
            ).fetchall()
        return [dict(r) for r in rows]

    def due_summary(self, user_id: str, limit: int = 5) -> str:
        """Human-readable one-liner of concepts due for review (W2.2)."""
        due = self.get_due_reviews(user_id, limit=limit)
        if not due:
            return ""
        return "Concepts due for review: " + ", ".join(
            f"{d['concept']} (mastery {d['mastery']:.0%})" for d in due
        )

    def summarize_session(
        self, user_id: str, session_id: str, touched_concepts: List[str]
    ) -> int:
        """Session-boundary rollup (W2.4): one episode per concept touched in
        the session, WITHOUT fabricating test results.

        Deliberately bypasses record_episode's feedback loop: a session that
        merely touched a concept is 'partial' with no success signal, so
        mastery/confidence must NOT move. We only stamp last_exposed and log
        the episode for traceability. Returns the number of episodes written.
        """
        now = _now()
        written = 0
        with self._connect() as conn:
            for concept in dict.fromkeys(c.strip() for c in touched_concepts if c and c.strip()):
                node_id = self._resolve_concept(conn, user_id, concept, "general")
                conn.execute(
                    "UPDATE knowledge_nodes SET last_exposed=? WHERE node_id=?",
                    (now, node_id),
                )
                conn.execute(
                    "INSERT INTO learning_episodes(user_id, session_id, goal, concept, plugin, "
                    "method, result, reason, new_strategy, messages_ref, created_at) "
                    "VALUES(?,?,?,?,'','','partial','session_end','','',?)",
                    (user_id, session_id, f"session {session_id} rollup", concept, now),
                )
                written += 1
        return written

    def enqueue_review(
        self,
        user_id: str,
        concept: str,
        domain: str = "general",
        interval_days: int = 0,
    ) -> None:
        now = _now()
        with self._connect() as conn:
            node_id = self._resolve_concept(conn, user_id, concept, domain)
            due = (datetime.now(timezone.utc) + timedelta(days=interval_days)).isoformat(timespec="seconds")
            conn.execute(
                "INSERT INTO review_queue(user_id, node_id, ease, interval, due, last_review) "
                "VALUES(?,?,2.5,?,?,NULL) "
                "ON CONFLICT(user_id, node_id) DO UPDATE SET due=excluded.due, interval=excluded.interval",
                (user_id, node_id, interval_days, due),
            )

    def reschedule_review(self, user_id: str, node_id: int, success: bool) -> None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT ease, interval FROM review_queue WHERE user_id=? AND node_id=?",
                (user_id, node_id),
            ).fetchone()
            if row is None:
                return
            ease = float(row["ease"])
            interval = int(row["interval"])
            if success:
                new_interval = max(int(interval * ease), 1)
                new_ease = min(ease + EASE_STEP_UP, EASE_MAX)
            else:
                new_interval = 0
                new_ease = max(ease - EASE_STEP_DOWN, EASE_MIN)
            due = (datetime.now(timezone.utc) + timedelta(days=new_interval)).isoformat(timespec="seconds")
            conn.execute(
                "UPDATE review_queue SET ease=?, interval=?, due=?, last_review=? "
                "WHERE user_id=? AND node_id=?",
                (new_ease, new_interval, due, _now(), user_id, node_id),
            )

    # -- injection helpers (W0.6 / W0.7) --------------------------------------

    _SPLIT_RE = re.compile(r"[\s,;.:!?()\[\]{}<>/\\\-_]+")

    def concepts_in_text(self, user_id: str, text: str, limit: int = 20) -> List[str]:
        """Return known concepts (attempts>0) whose name appears in ``text``.

        Used by the session-boundary rollup to find which concepts a session
        actually touched. Pure lexical matching, consistent with prefetch.
        """
        if not text:
            return []
        tokens = {t.lower() for t in self._SPLIT_RE.split(text) if len(t) >= 2}
        hits: List[str] = []
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT concept FROM knowledge_nodes WHERE user_id=? AND attempts > 0",
                (user_id,),
            ).fetchall()
            for r in rows:
                c = (r["concept"] or "").lower()
                if c in tokens or any(t in c or c in t for t in tokens):
                    hits.append(r["concept"])
                if len(hits) >= limit:
                    break
        return hits

    def build_static_block(self, user_id: Optional[str] = None) -> str:
        """Static system-prompt tier: L1 identity + L5 active rules + L3 top patterns.

        Called at session start (volatile tier freeze makes it stable for the
        whole session, which is fine: identity/rules change at low frequency).
        """
        uid = user_id or self.user_id
        parts: List[str] = []
        ident = self.get_identity(uid)
        if ident and (ident.get("background") or ident.get("goals")):
            lines = []
            if ident.get("background"):
                lines.append(f"Profile: {ident['background']}")
            if ident.get("goals"):
                lines.append("Goals: " + ", ".join(ident["goals"]))
            if ident.get("interests"):
                lines.append("Interests: " + ", ".join(ident["interests"]))
            parts.append("\n".join(lines))
        rules = [r for r in self.list_rules(uid, status="active") if r["rule"]]
        if rules:
            parts.append(
                "Learning rules:\n"
                + "\n".join(f"{i+1}. {r['rule']} (evidence={r['confirmed'] + r['refuted']})" for i, r in enumerate(rules[:5]))
            )
        patterns = self.top_patterns(uid, limit=5)
        if patterns:
            parts.append(
                "Learning patterns:\n"
                + "\n".join(
                    f"{p['concept']} → {p['method']} ({int(p['success_rate'] * 100)}% / {p['attempts']} tries)"
                    for p in patterns
                )
            )
        if not parts:
            return ""
        return (
            "<learner-state>\n"
            "[System note: Learner state — the user's knowledge status and "
            "proven learning preferences. Use it to adapt teaching, NOT as "
            "conversation history.]\n\n"
            + "\n\n".join(parts)
            + "\n</learner-state>"
        )

    def prefetch_context(self, query: str, user_id: Optional[str] = None, limit: int = 10) -> str:
        """Per-turn dynamic tier: knowledge nodes matching the user's query
        plus due reviews, wrapped as a fenced context block.

        Reuses the same fenced style as the memory-provider prefetch channel
        so the agent treats it as authoritative reference, not user input.
        """
        uid = user_id or self.user_id
        tokens = {t.lower() for t in self._SPLIT_RE.split(query) if len(t) >= 2}
        matched: List[Dict[str, Any]] = []
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT concept, domain, mastery, confidence, attempts, last_test "
                "FROM knowledge_nodes WHERE user_id=? AND attempts > 0 "
                "ORDER BY last_test DESC LIMIT 200",
                (uid,),
            ).fetchall()
            for r in rows:
                c = (r["concept"] or "").lower()
                d = (r["domain"] or "").lower()
                if tokens and (c in tokens or d in tokens or any(t in c or c in t for t in tokens)):
                    matched.append(dict(r))
                if len(matched) >= limit:
                    break
        due = self.get_due_reviews(uid, limit=limit)
        lines: List[str] = []
        if matched:
            lines.append("Knowledge state (matched concepts):")
            lines.extend(
                f"- {m['concept']}: mastery {m['mastery']:.0%}, confidence {m['confidence']:.0%}, "
                f"{m['attempts']} tests"
                for m in matched
            )
        if due:
            lines.append("Due for review:")
            lines.extend(f"- {d['concept']} (mastery {d['mastery']:.0%})" for d in due)
        if not lines:
            return ""
        return (
            "<memory-context>\n"
            "[System note: The following is recalled learner state, NOT new "
            "user input. Treat as authoritative reference data.]\n\n"
            + "\n".join(lines)
            + "\n</memory-context>"
        )

    # -- tool handler (W0.8) --------------------------------------------------

    def handle_action(self, user_id: str, action: str, **kw: Any) -> Dict[str, Any]:
        """Dispatch the model-facing learner_state tool (D6: one tool, many
        actions, mirroring the built-in memory tool)."""
        try:
            if action == "upsert_concept":
                concept = _sanitize_field(str(kw.get("concept") or ""))
                if not concept:
                    return {"success": False, "error": "concept required"}
                node = self.upsert_concept(
                    user_id,
                    concept,
                    domain=_sanitize_field(str(kw.get("domain") or "general")) or "general",
                    tested="success" in kw and kw["success"] is not None,
                    success=bool(kw.get("success")),
                    exposed=bool(kw.get("exposed", False)),
                )
                return {"success": True, "node": node}
            if action == "record_episode":
                goal = _sanitize_field(str(kw.get("goal") or ""))
                if not goal:
                    return {"success": False, "error": "goal required"}
                ep = self.record_episode(
                    user_id,
                    goal,
                    concept=_sanitize_field(str(kw.get("concept") or "")),
                    plugin=_sanitize_field(str(kw.get("plugin") or "")),
                    method=_sanitize_field(str(kw.get("method") or "")),
                    result=str(kw.get("result") or "partial"),
                    reason=_sanitize_field(str(kw.get("reason") or "")),
                    new_strategy=_sanitize_field(str(kw.get("new_strategy") or "")),
                )
                return {"success": True, "episode": ep}
            if action == "query_knowledge":
                concepts = kw.get("concepts") or []
                rows = self.get_knowledge(user_id, concepts=[str(c) for c in concepts] if concepts else None)
                return {"success": True, "knowledge": rows}
            if action == "add_rule":
                rule = _sanitize_field(str(kw.get("rule") or ""))
                if not rule:
                    return {"success": False, "error": "rule required"}
                r = self.add_rule(user_id, rule, source=str(kw.get("source") or "manual"))
                return {"success": True, "rule": r}
            if action == "due_reviews":
                _limit_raw = kw.get("limit", 5)
                limit = int(_limit_raw) if _limit_raw is not None else 5
                due = self.get_due_reviews(user_id, limit=limit)
                return {
                    "success": True,
                    "due": due,
                    "summary": self.due_summary(user_id, limit=limit),
                }
            return {"success": False, "error": f"unknown action: {action}"}
        except Exception as e:  # pragma: no cover - defensive
            return {"success": False, "error": str(e)}
