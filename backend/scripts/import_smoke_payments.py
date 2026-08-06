"""Import smoke test for the payments module (run from backend/ with deps installed)."""
import os
import sys

BACKEND = r"D:\github projects\lemma-ai\backend"
sys.path.insert(0, BACKEND)

# Mirror the real boot: load backend/.env into the process environment so
# pydantic-settings resolves all required fields (supabase_url, database_url, ...).
_env_path = os.path.join(BACKEND, ".env")
if os.path.exists(_env_path):
    with open(_env_path, encoding="utf-8") as _f:
        for _line in _f:
            _line = _line.strip()
            if not _line or _line.startswith("#") or "=" not in _line:
                continue
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

os.chdir(BACKEND)

# The repo's backend/.env only holds PayPal secrets; the other required fields
# live in the user's real environment. Supply dummies so Settings() constructs
# for this import-only test (no DB connection happens during import).
for _req, _dummy in {
    "supabase_url": "https://example.supabase.co",
    "database_url": "postgresql+asyncpg://u:p@localhost/db",
    "openrouter_api_key": "dummy",
    "aihubmix_api_key": "dummy",
}.items():
    os.environ.setdefault(_req, _dummy)

import core.config  # triggers Settings() from .env

print("config OK | paypal_ready =", core.config.settings.paypal_ready,
      "| mode =", core.config.settings.paypal_mode)

from core.database import Base  # single metadata registry
import models  # registers all ORM tables on Base.metadata

print("models OK | tables:", sorted(Base.metadata.tables.keys()))

import schemas.payment  # noqa: F401
import services.payments.paypal_client  # noqa: F401
import services.payments.fulfillment  # noqa: F401
import services.payments.pricing  # noqa: F401

print("services OK | packs:", [p.id for p in services.payments.pricing.CREDIT_PACKS])

import api.v1.payments  # noqa: F401
import api.v1.webhooks  # noqa: F401

print("routers OK | payments routes:", [r.path for r in api.v1.payments.router.routes])
print("ALL IMPORTS OK")
