"""Dev-dashboard auth: env-configured devs (ceaser / syk) + HMAC session tokens.

Credentials live in env (`DEV_DASHBOARD_USERS="ceaser:lemma123,syk:lemma123"`),
never in code. Tokens are short-lived (12h) and signed with
`DEV_DASHBOARD_TOKEN_SECRET`. The whole dashboard is dev-only and must stay
disabled in production.
"""

import base64
import hashlib
import hmac
import json
import time

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer

from core.config import settings

TOKEN_TTL_SECONDS = 12 * 3600
_bearer = HTTPBearer(auto_error=False)


def dev_users() -> dict[str, str]:
    """Parse "user:pass,user:pass" from env into {username: password}."""
    out: dict[str, str] = {}
    for pair in (settings.dev_dashboard_users or "").split(","):
        pair = pair.strip()
        if ":" in pair:
            username, password = pair.split(":", 1)
            out[username.strip()] = password
    return out


def _sign(payload: bytes) -> bytes:
    secret = settings.dev_dashboard_token_secret or "lemma-dev-insecure"
    return hmac.new(secret.encode(), payload, hashlib.sha256).digest()


def issue_token(username: str) -> str:
    payload = json.dumps(
        {"u": username, "e": int(time.time()) + TOKEN_TTL_SECONDS},
        separators=(",", ":"),
    ).encode()
    return base64.urlsafe_b64encode(payload + b"." + _sign(payload)).decode()


def verify_token(token: str | None) -> str | None:
    if not token:
        return None
    try:
        raw = base64.urlsafe_b64decode(token.encode())
        payload, signature = raw.rsplit(b".", 1)
        if not hmac.compare_digest(_sign(payload), signature):
            return None
        data = json.loads(payload)
        if data.get("e", 0) < time.time():
            return None
        return str(data.get("u", "")) or None
    except Exception:  # noqa: BLE001 — malformed token = not authenticated
        return None


def require_dev(creds=Depends(_bearer)) -> str:
    """FastAPI dependency: returns the authenticated dev username."""
    if not settings.dev_dashboard_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    username = verify_token(creds.credentials if creds else None)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid or expired dev token",
        )
    return username
