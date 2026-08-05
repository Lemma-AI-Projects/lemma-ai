"""Component start/stop for dev environments (subprocess-backed, audited).

Only mounted while DEV_DASHBOARD_ENABLED; every control action writes a
dev_audit_logs row so the two developers know who touched what. Production
must never enable this (control endpoints spawn/kill local processes).
"""

import json
import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import select

from admindev import monitor
from core.database import AsyncSessionLocal
from models.dev_audit_log import DevAuditLog

_STATE_FILE = Path(
    os.environ.get("LEMMA_DEV_STATE", str(Path.home()))
) / ".lemma_dev_components.json"

# Component registry: how to (re)start each dev component.
_START_CMDS = {
    "redis": ["redis-server"],
    "celery-worker": [
        sys.executable, "-m", "celery", "-A", "tasks.celery_app",
        "worker", "--loglevel=info",
    ],
    "celery-beat": [
        sys.executable, "-m", "celery", "-A", "tasks.celery_app",
        "beat", "--loglevel=info",
    ],
}


def _load_state() -> dict[str, list[int]]:
    try:
        return json.loads(_STATE_FILE.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001 — first run / corrupt file
        return {}


def _save_state(state: dict[str, list[int]]) -> None:
    _STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    _STATE_FILE.write_text(json.dumps(state), encoding="utf-8")


def _pid_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except Exception:  # noqa: BLE001
        return False


def _live_pids(name: str) -> list[int]:
    return [pid for pid in _load_state().get(name, []) if _pid_alive(pid)]


def _spawn(name: str) -> int:
    cmd = _START_CMDS[name]
    log = open(f"{_STATE_FILE.parent / f'lemma-{name}.log'}", "a", encoding="utf-8")
    proc = subprocess.Popen(
        cmd,
        cwd=str(Path(__file__).resolve().parents[2]),
        stdout=log,
        stderr=log,
        start_new_session=True,
    )
    state = _load_state()
    state.setdefault(name, []).append(proc.pid)
    _save_state(state)
    return proc.pid


async def component_status(name: str) -> dict:
    if name == "redis":
        return await monitor.probe_redis()
    if name == "celery-worker":
        return await monitor.probe_celery()
    if name == "celery-beat":
        pids = _live_pids(name)
        return {"status": "up" if pids else "down", "pids": pids}
    return {"status": "unknown", "note": f"no controller for {name}"}


async def _audit(actor: str, action: str, detail: str | None = None) -> None:
    try:
        async with AsyncSessionLocal() as session:
            session.add(
                DevAuditLog(actor=actor, action=action, detail=detail)
            )
            await session.commit()
    except Exception:  # noqa: BLE001 — audit must never break the action
        pass


async def start(name: str, actor: str) -> dict:
    if name not in _START_CMDS:
        return {"ok": False, "error": f"no controller for {name}"}
    pids = _live_pids(name)
    if pids:
        return {"ok": True, "already_running": True, "pids": pids}
    try:
        pid = _spawn(name)
    except Exception as exc:  # noqa: BLE001
        await _audit(actor, f"component:{name}:start", f"failed: {type(exc).__name__}")
        return {"ok": False, "error": type(exc).__name__}
    await _audit(actor, f"component:{name}:start", f"pid={pid}")
    return {"ok": True, "pid": pid}


async def stop(name: str, actor: str) -> dict:
    pids = _live_pids(name)
    if not pids:
        return {"ok": True, "already_stopped": True}
    killed: list[int] = []
    for pid in pids:
        try:
            os.kill(pid, 15)  # SIGTERM; dev components exit cleanly
            killed.append(pid)
        except Exception:  # noqa: BLE001
            pass
    state = _load_state()
    state[name] = [p for p in state.get(name, []) if not _pid_alive(p)]
    _save_state(state)
    await _audit(actor, f"component:{name}:stop", f"pids={killed}")
    return {"ok": True, "stopped": killed}


async def restart(name: str, actor: str) -> dict:
    await stop(name, actor)
    return await start(name, actor)


async def list_components() -> list[dict]:
    out = []
    for name in _START_CMDS:
        st = await component_status(name)
        out.append({"name": name, **st})
    return out


async def recent_audit(limit: int = 50) -> list[dict]:
    async with AsyncSessionLocal() as session:
        rows = (
            await session.execute(
                select(DevAuditLog).order_by(DevAuditLog.created_at.desc()).limit(limit)
            )
        ).scalars()
        return [
            {
                "actor": r.actor,
                "action": r.action,
                "detail": r.detail,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
