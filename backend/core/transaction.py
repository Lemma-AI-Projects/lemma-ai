"""Transaction scope and transaction-level locks for writes that span modules.

transaction(db) joins the enclosing scope or opens a new one:

- The outermost scope is the one entered while the depth counter kept in
  `db.info` is 0. Only it commits (or rolls back and re-raises). Inner scopes
  just pass exceptions outward.
- `db.in_transaction()` cannot tell the outermost scope: SQLAlchemy autobegins
  on the first statement, so after any read (e.g. the api layer loading a row
  before calling an action) it is already True and nobody would commit.
- Every scope flushes once when it exits normally (the outermost one before
  committing), so the enclosing code can read what the inner one wrote and a
  constraint violation surfaces in the scope that caused it. Code that writes
  and then reads within the same scope still flushes itself.
- A caller that catches a failed sub-step and carries on must run that
  sub-step inside `db.begin_nested()` (a savepoint); otherwise the outermost
  commit also commits the half-written sub-step.
- Never call a function that commits by itself inside a scope: it would commit
  the enclosing work early. No AI calls, external requests or sleeps inside a
  scope either — it holds a pooled connection and possibly locks.

Session settings this relies on (core/database.py):

- autoflush=False: added or modified objects reach the database only on flush
  or commit, so later queries in the same transaction don't see them until
  then (hence the flush on scope exit).
- expire_on_commit=False: objects already loaded in the session are not
  refreshed. Data that must be re-read after taking a lock is read by column
  or with `populate_existing`, never from objects the session already holds.

Both pieces work under the Supabase session pooler: a transaction-level
advisory lock lives on the one connection the transaction already holds and
is released by COMMIT/ROLLBACK.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession

# Key in AsyncSession.info holding the current scope depth.
_DEPTH_KEY = "lemma_transaction_depth"

# How long a lock waiter may hold its pooled connection before giving up.
LOCK_TIMEOUT_S = 5.0


class LockTimeoutError(Exception):
    """lock_in_transaction waited longer than its timeout. Callers map it to
    their own business error (e.g. schedule_busy)."""


@asynccontextmanager
async def transaction(db: AsyncSession) -> AsyncIterator[None]:
    """Join the enclosing transaction scope, or open (and later commit) one."""
    raise NotImplementedError
    yield  # pragma: no cover


async def lock_in_transaction(
    db: AsyncSession, key: str, *, timeout_s: float = LOCK_TIMEOUT_S
) -> None:
    """Take a transaction-level advisory lock on `key` (pg_advisory_xact_lock
    on a 64-bit hash of the key), waiting at most `timeout_s`.

    Released automatically at COMMIT/ROLLBACK; re-taking it in the same
    transaction does not block. Raises RuntimeError when called outside a
    transaction scope (depth 0) — the lock would otherwise be held until some
    unknown later commit — and LockTimeoutError when the wait times out.
    """
    raise NotImplementedError
