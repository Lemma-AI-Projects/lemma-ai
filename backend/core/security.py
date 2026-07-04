import logging
import threading
import time
import uuid
from dataclasses import dataclass
from typing import Any

import anyio
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientConnectionError, PyJWKClientError

from core.config import settings

logger = logging.getLogger("lemma.security")

bearer_scheme = HTTPBearer(auto_error=False)

# Supabase user tokens are verified locally. New projects use asymmetric
# signing keys published at the JWKS URL; legacy projects can still use HS256
# with the project JWT secret.
#
# 7-4 事故: PyJWKClient is NOT thread-safe and fetches over the network on a
# cold/expired cache. Four parallel requests (one page load) raced four
# concurrent fetches on this box's high-latency link to supabase.co; the losers
# raised PyJWKClientError, which we mapped to 401 — and the frontend's 401
# handler then revoked the (perfectly valid) fresh session, bouncing the user
# straight back to the login page. Hence:
# - `_jwks_lock` serializes all JWKS access (one fetch fills the cache for
#   everyone; verification itself is fast and local);
# - `cache_keys=True` + a 1h lifespan keep the cold window rare (Supabase
#   rotates signing keys rarely; a rotation publishes the new kid immediately);
# - a fetch CONNECTION failure is an infra problem, not a verdict on the
#   token: it maps to 503 (frontend retries) instead of 401 (frontend signs
#   the user out).
_jwks_client = PyJWKClient(
    settings.supabase_jwks_url,
    cache_keys=True,
    lifespan=3600,
    timeout=10,
)
_jwks_lock = threading.Lock()

_JWKS_FETCH_ATTEMPTS = 2
_JWKS_RETRY_DELAY_S = 0.5
_JWKS_ALGORITHMS = frozenset({"ES256", "RS256"})
_HMAC_ALGORITHMS = frozenset({"HS256"})

# Clock-skew tolerance for iat/nbf/exp checks. 7-4 事故(第二幕): this box's
# clock ran ~2s behind Supabase's, so a FRESHLY minted token carried an iat two
# seconds in the future -> ImmatureSignatureError -> the whole first wave of
# page-load requests 401'd and only the ~1s-later React Query retries landed
# (UI loaded in slow, staggered chunks). 30s is the conventional allowance for
# NTP drift; the security cost (a token accepted up to 30s past exp) is nil in
# practice since tokens are 1h-lived and revocation isn't checked here anyway.
_CLOCK_SKEW_LEEWAY_S = 30

_INVALID_TOKEN = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="invalid_token",
    headers={"WWW-Authenticate": "Bearer"},
)

_AUTH_KEYS_UNAVAILABLE = HTTPException(
    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
    detail="auth_keys_unavailable",
)


@dataclass(frozen=True)
class CurrentUser:
    id: uuid.UUID
    email: str | None


def _get_signing_key(token: str) -> Any:
    for attempt in range(_JWKS_FETCH_ATTEMPTS):
        try:
            with _jwks_lock:
                return _jwks_client.get_signing_key_from_jwt(token)
        except PyJWKClientConnectionError:
            if attempt + 1 >= _JWKS_FETCH_ATTEMPTS:
                raise _AUTH_KEYS_UNAVAILABLE from None
            time.sleep(_JWKS_RETRY_DELAY_S)
        except PyJWKClientError as exc:
            if "Unable to find a signing key" in str(exc):
                raise
            raise _AUTH_KEYS_UNAVAILABLE from exc
    raise _AUTH_KEYS_UNAVAILABLE  # unreachable; keeps the type checker honest


def _jwt_decode_options() -> dict[str, list[str]]:
    return {"require": ["exp", "sub"]}


def _decode_jwks_token(token: str, algorithm: str) -> dict[str, Any]:
    if algorithm not in _JWKS_ALGORITHMS:
        raise jwt.InvalidAlgorithmError(f"unsupported JWT alg: {algorithm}")

    signing_key = _get_signing_key(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=[algorithm],
        audience=settings.supabase_jwt_audience,
        issuer=settings.supabase_jwt_issuer,
        options=_jwt_decode_options(),
        leeway=_CLOCK_SKEW_LEEWAY_S,
    )


def _decode_hmac_token(token: str, algorithm: str) -> dict[str, Any]:
    if not settings.supabase_jwt_secret:
        raise jwt.InvalidTokenError(
            "token uses symmetric alg but SUPABASE_JWT_SECRET is not configured"
        )

    return jwt.decode(
        token,
        settings.supabase_jwt_secret,
        algorithms=[algorithm],
        audience=settings.supabase_jwt_audience,
        issuer=settings.supabase_jwt_issuer,
        options=_jwt_decode_options(),
        leeway=_CLOCK_SKEW_LEEWAY_S,
    )


def _decode_token(token: str) -> dict[str, Any]:
    header = jwt.get_unverified_header(token)
    algorithm = header.get("alg")
    if not isinstance(algorithm, str) or not algorithm:
        raise jwt.InvalidAlgorithmError("missing JWT alg header")

    if algorithm in _HMAC_ALGORITHMS:
        return _decode_hmac_token(token, algorithm)
    return _decode_jwks_token(token, algorithm)


def _unverified_claims(token: str) -> str:
    """Claim metadata for the 401 log line (no secrets: header + timestamps)."""
    try:
        header = jwt.get_unverified_header(token)
        payload = jwt.decode(token, options={"verify_signature": False})
        return (
            f"alg={header.get('alg')} kid={header.get('kid')} "
            f"iss={payload.get('iss')} aud={payload.get('aud')} "
            f"iat={payload.get('iat')} exp={payload.get('exp')} now={int(time.time())}"
        )
    except Exception:  # noqa: BLE001 — malformed token; nothing to report
        return "unparseable token"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    if credentials is None or not credentials.credentials:
        logger.warning("auth 401: no Authorization header on request")
        raise _INVALID_TOKEN

    try:
        payload = await anyio.to_thread.run_sync(_decode_token, credentials.credentials)
    except HTTPException:
        raise  # 503 from the JWKS fetch path — not a token verdict
    except jwt.PyJWTError as exc:
        logger.warning(
            "auth 401: %s: %s (%s)",
            type(exc).__name__,
            exc,
            _unverified_claims(credentials.credentials),
        )
        raise _INVALID_TOKEN from exc

    subject = payload.get("sub")
    if not subject:
        raise _INVALID_TOKEN

    try:
        user_id = uuid.UUID(subject)
    except ValueError as exc:
        raise _INVALID_TOKEN from exc

    return CurrentUser(id=user_id, email=payload.get("email"))
