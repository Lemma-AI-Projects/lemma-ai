"""Shared pytest setup.

core.config.Settings requires a few env vars at import time. Unit tests never
touch the network or the database, so placeholder values are enough; a real
backend/.env (when present) still wins because setdefault never overrides.
"""

import os

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost:5432/postgres")
os.environ.setdefault("OPENROUTER_API_KEY", "test")
os.environ.setdefault("AIHUBMIX_API_KEY", "test")
