"""learner_schema — learner.db schema definition and idempotent migrations.

Pure stdlib (sqlite3). The learner database is intentionally separate from
state.db (D3): it owns the five-layer learner state (identity, knowledge,
patterns, episodes, meta rules) plus the spaced-repetition review queue.

Migration model is deliberately small: a ``schema_version`` table plus an
ordered dict of version -> SQL. Migrations run inside one transaction each.
"""

from __future__ import annotations

import sqlite3
from typing import Dict

SCHEMA_VERSION = 1

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS identity (
    user_id    TEXT PRIMARY KEY,
    goals      TEXT DEFAULT '[]',
    interests  TEXT DEFAULT '[]',
    background TEXT DEFAULT '',
    version    INTEGER DEFAULT 1,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_nodes (
    node_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT NOT NULL,
    concept      TEXT NOT NULL,
    domain       TEXT DEFAULT 'general',
    mastery      REAL DEFAULT 0.0,
    confidence   REAL DEFAULT 0.1,
    attempts     INTEGER DEFAULT 0,
    successes    INTEGER DEFAULT 0,
    last_test    TIMESTAMP,
    last_exposed TIMESTAMP,
    source       TEXT DEFAULT '',
    UNIQUE(user_id, concept, domain)
);
CREATE INDEX IF NOT EXISTS idx_nodes_user ON knowledge_nodes(user_id);

CREATE TABLE IF NOT EXISTS knowledge_edges (
    user_id  TEXT NOT NULL,
    parent   INTEGER NOT NULL REFERENCES knowledge_nodes(node_id),
    child    INTEGER NOT NULL REFERENCES knowledge_nodes(node_id),
    weight   REAL DEFAULT 0.5,
    PRIMARY KEY(user_id, parent, child)
);

CREATE TABLE IF NOT EXISTS learning_patterns (
    pattern_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT NOT NULL,
    concept      TEXT NOT NULL,
    method       TEXT NOT NULL,
    attempts     INTEGER DEFAULT 0,
    successes    INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0.5,
    last_used    TIMESTAMP,
    UNIQUE(user_id, concept, method)
);

CREATE TABLE IF NOT EXISTS learning_episodes (
    episode_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT NOT NULL,
    session_id   TEXT DEFAULT '',
    goal         TEXT NOT NULL,
    concept      TEXT DEFAULT '',
    plugin       TEXT DEFAULT '',
    method       TEXT DEFAULT '',
    result       TEXT DEFAULT '',
    reason       TEXT DEFAULT '',
    new_strategy TEXT DEFAULT '',
    messages_ref TEXT DEFAULT '',
    created_at   TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_episodes_user_goal ON learning_episodes(user_id, goal);

CREATE TABLE IF NOT EXISTS meta_rules (
    rule_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    rule       TEXT NOT NULL,
    evidence   INTEGER DEFAULT 1,
    confirmed  INTEGER DEFAULT 0,
    refuted    INTEGER DEFAULT 0,
    domain     TEXT DEFAULT 'teaching',
    source     TEXT DEFAULT '',
    status     TEXT DEFAULT 'hypothesis',
    created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS review_queue (
    user_id     TEXT NOT NULL,
    node_id     INTEGER NOT NULL REFERENCES knowledge_nodes(node_id),
    ease        REAL DEFAULT 2.5,
    interval    INTEGER DEFAULT 0,
    due         TIMESTAMP,
    last_review TIMESTAMP,
    PRIMARY KEY(user_id, node_id)
);
"""

# Ordered migrations: version -> SQL to apply when upgrading FROM version-1.
MIGRATIONS: Dict[int, str] = {
    1: SCHEMA_SQL,
}


def migrate(db_path: str) -> None:
    """Create/migrate the learner database. Idempotent and safe to call
    repeatedly (CREATE TABLE IF NOT EXISTS + version tracking)."""
    conn = sqlite3.connect(db_path, timeout=5.0)
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_version ("
            "version INTEGER PRIMARY KEY, applied_at TIMESTAMP)"
        )
        row = conn.execute("SELECT MAX(version) FROM schema_version").fetchone()
        current = row[0] if row and row[0] is not None else 0
        for version in sorted(MIGRATIONS):
            if version > current:
                conn.executescript(MIGRATIONS[version])
                conn.execute(
                    "INSERT INTO schema_version(version, applied_at) VALUES(?, ?)",
                    (version, "now"),
                )
        conn.commit()
    finally:
        conn.close()
