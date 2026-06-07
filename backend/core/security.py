import uuid
from dataclasses import dataclass
from typing import Any

import anyio
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)

# Supabase signs user tokens with an asymmetric ES256 key. We only need its
# public key, published at the JWKS URL, to verify signatures locally.
# PyJWKClient fetches and caches those keys for us.
_jwks_client = PyJWKClient(settings.supabase_jwks_url)

_INVALID_TOKEN = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="invalid_token",
    headers={"WWW-Authenticate": "Bearer"},
)


@dataclass(frozen=True)
class CurrentUser:
    id: uuid.UUID
    email: str | None


def _decode_token(token: str) -> dict[str, Any]:
    signing_key = _jwks_client.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["ES256"],
        audience=settings.supabase_jwt_audience,
        issuer=settings.supabase_jwt_issuer,
        options={"require": ["exp", "sub"]},
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    if credentials is None or not credentials.credentials:
        raise _INVALID_TOKEN

    try:
        payload = await anyio.to_thread.run_sync(_decode_token, credentials.credentials)
    except jwt.PyJWTError as exc:
        raise _INVALID_TOKEN from exc

    subject = payload.get("sub")
    if not subject:
        raise _INVALID_TOKEN

    try:
        user_id = uuid.UUID(subject)
    except ValueError as exc:
        raise _INVALID_TOKEN from exc

    return CurrentUser(id=user_id, email=payload.get("email"))
