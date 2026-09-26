"""Shared pytest setup.

core.config.Settings requires a few env vars at import time. Unit tests never
touch the network, so placeholder values are enough — but the placeholder must
not shadow the project's own `.env`, or every `*_db` test silently skips.

That is not hypothetical: pydantic-settings ranks a real environment variable
ABOVE `.env`, so `os.environ.setdefault("DATABASE_URL", <localhost placeholder>)`
made every database test fail its connection probe and skip — for a checkout
that had a perfectly good local Postgres. So the `.env` is read here first and
only genuinely missing values fall back to placeholders.
"""

import os
import pathlib

_ENV_FILE = pathlib.Path(__file__).resolve().parents[1] / ".env"


def _from_env_file(key: str) -> str | None:
    """The value of `key` in backend/.env, or None.

    A deliberately small reader rather than dotenv: it runs before anything else
    is imported, it only needs `KEY=value` lines, and adding a dependency to the
    test harness for this would be the wrong trade.
    """
    if not _ENV_FILE.exists():
        return None
    for raw in _ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, _, value = line.partition("=")
        if name.strip() == key:
            return value.strip().strip('"').strip("'") or None
    return None


def _default(key: str, placeholder: str) -> None:
    os.environ.setdefault(key, _from_env_file(key) or placeholder)


_default("SUPABASE_URL", "https://example.supabase.co")
_default("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost:5432/postgres")
_default("OPENROUTER_API_KEY", "test")
_default("AIHUBMIX_API_KEY", "test")
