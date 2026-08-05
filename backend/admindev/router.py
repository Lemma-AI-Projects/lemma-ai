"""/admindev/api router — mounted only when DEV_DASHBOARD_ENABLED."""

import time

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from admindev import control, messages, monitor
from admindev.auth import dev_users, issue_token, require_dev

router = APIRouter(prefix="/admindev/api", tags=["admindev"])

# In-memory login rate limit (per-username): 10 attempts / 60s.
_login_attempts: dict[str, list[float]] = {}
_LOGIN_WINDOW = 60
_LOGIN_MAX = 10


class LoginBody(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class MessageBody(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


def _rate_limited(username: str) -> bool:
    now = time.time()
    window = [t for t in _login_attempts.get(username, []) if now - t < _LOGIN_WINDOW]
    if len(window) >= _LOGIN_MAX:
        _login_attempts[username] = window
        return True
    window.append(now)
    _login_attempts[username] = window
    return False


@router.post("/login")
async def login(body: LoginBody) -> dict:
    users = dev_users()
    expected = users.get(body.username)
    if expected is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="bad credentials")
    if _rate_limited(body.username):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="too many login attempts, slow down",
        )
    if expected != body.password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="bad credentials")
    return {"token": issue_token(body.username), "username": body.username}


@router.get("/me")
async def me(actor: str = Depends(require_dev)) -> dict:
    return {"username": actor}


@router.get("/monitor")
async def full_monitor(_: str = Depends(require_dev)) -> dict:
    return await monitor.collect()


@router.get("/components")
async def components(_: str = Depends(require_dev)) -> dict:
    return {"components": await control.list_components()}


@router.post("/components/{name}/start")
async def component_start(name: str, actor: str = Depends(require_dev)) -> dict:
    return await control.start(name, actor)


@router.post("/components/{name}/stop")
async def component_stop(name: str, actor: str = Depends(require_dev)) -> dict:
    return await control.stop(name, actor)


@router.post("/components/{name}/restart")
async def component_restart(name: str, actor: str = Depends(require_dev)) -> dict:
    return await control.restart(name, actor)


@router.get("/messages")
async def get_messages(_: str = Depends(require_dev)) -> dict:
    return {"messages": await messages.list_messages()}


@router.post("/messages")
async def post_message(body: MessageBody, actor: str = Depends(require_dev)) -> dict:
    return await messages.create_message(actor, body.body)


@router.delete("/messages/{message_id}")
async def del_message(message_id: str, actor: str = Depends(require_dev)) -> dict:
    deleted = await messages.delete_message(message_id, actor)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found or not yours")
    return {"ok": True}


@router.get("/audit")
async def audit_log(_: str = Depends(require_dev)) -> dict:
    return {"audit": await control.recent_audit()}
