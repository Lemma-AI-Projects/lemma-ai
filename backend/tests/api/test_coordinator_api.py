"""The Coordinator over HTTP: the chain end to end, and the read surfaces.

What is asserted here is what the product actually promises, over the real API:

  * `POST /knowledge/evidence` — a learner's answer — ends with a **reminder in
    the feed** (`GET /notifications`) and a **recorded decision**
    (`GET /coordinator/decisions`). No browser, no waiting, no fake call.
  * the decision log's wire shape (camelCase, ISO timestamps),
  * `GET /coordinator/explain` explains without touching anything,
  * auth and IDOR behave like every other surface.

Auth is the only thing faked (a `CurrentUser` in place of a token). The skip and
event-loop rules are the same as the other API tests: `asyncio.run()` must not run
inside the TestClient block.
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text

from core.database import AsyncSessionLocal, engine, get_db
from core.security import CurrentUser, get_current_user
from main import app
from schemas.knowledge import KnowledgeImportIn
from services import knowledge_service

BASE = "矩阵基础"
MIDDLE = "线性无关"
TOP = "特征值"


def run(coro):
    """asyncio.run with the pool drained on both sides (see test_notifications_db)."""

    async def wrapper():
        with contextlib.suppress(Exception):
            await engine.dispose()
        try:
            return await coro
        finally:
            with contextlib.suppress(Exception):
                await engine.dispose()

    return asyncio.run(wrapper())


async def _create_space() -> tuple[uuid.UUID, uuid.UUID]:
    user_id, project_id = uuid.uuid4(), uuid.uuid4()
    email = f"coordinator-api-test-{user_id}@example.test"
    async with engine.begin() as conn:
        await conn.execute(
            text("insert into auth.users (id, email) values (:id, :email)"),
            {"id": user_id, "email": email},
        )
        await conn.execute(
            text(
                "insert into profiles (id, email, avatar_color) "
                "values (:id, :email, :color)"
            ),
            {"id": user_id, "email": email, "color": "#000000"},
        )
        await conn.execute(
            text("insert into projects (id, user_id, name) values (:id, :u, :n)"),
            {"id": project_id, "u": user_id, "n": "coordinator-api-space"},
        )
    async with AsyncSessionLocal() as db:
        await knowledge_service.import_structure(
            db,
            project_id=project_id,
            payload=KnowledgeImportIn(
                items=[
                    KnowledgeImportIn.DraftItem(ref="a", label=BASE),
                    KnowledgeImportIn.DraftItem(ref="b", label=MIDDLE),
                    KnowledgeImportIn.DraftItem(ref="c", label=TOP),
                ],
                edges=[
                    KnowledgeImportIn.DraftEdge(from_ref="a", to_ref="b"),
                    KnowledgeImportIn.DraftEdge(from_ref="b", to_ref="c"),
                ],
            ),
        )
    return user_id, project_id


async def _drop_user(user_id: uuid.UUID) -> None:
    async with engine.begin() as conn:
        await conn.execute(text("delete from auth.users where id = :id"), {"id": user_id})


@pytest.fixture()
def client():
    """An unauthenticated client — the real dependency chain, no token."""
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


@pytest.fixture()
def authed_client():
    """A client whose caller is a throwaway user with a real three-item space."""

    async def _probe():
        async with engine.connect() as conn:
            await conn.execute(text("select 1"))

    try:
        run(_probe())
    except Exception as exc:  # noqa: BLE001 — any failure means "no database here"
        pytest.skip(f"no database reachable: {type(exc).__name__}: {exc}")

    user_id, project_id = run(_create_space())

    async def _session():
        async with AsyncSessionLocal() as session:
            yield session

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email=None
    )
    app.dependency_overrides[get_db] = _session
    try:
        with TestClient(app, raise_server_exceptions=False) as test_client:
            yield test_client, user_id, project_id
    finally:
        app.dependency_overrides.clear()
        run(_drop_user(user_id))


def _evidence(project_id: uuid.UUID, *, verdict: str = "correct", tier: str = "A") -> dict:
    return {
        "projectId": str(project_id),
        "itemLabel": MIDDLE,
        "verdict": verdict,
        "tier": tier,
        "reasoning": "api test",
    }


# --- auth -------------------------------------------------------------------


def test_the_coordinator_requires_a_token(client):
    assert client.get("/api/v1/coordinator/decisions").status_code == 401
    assert (
        client.get(
            "/api/v1/coordinator/explain", params={"projectId": str(uuid.uuid4())}
        ).status_code
        == 401
    )


# --- the chain over HTTP ----------------------------------------------------


def test_an_answer_ends_with_a_reminder_and_a_recorded_decision(authed_client):
    client, _user_id, project_id = authed_client

    written = client.post("/api/v1/knowledge/evidence", json=_evidence(project_id))
    assert written.status_code == 201, written.text

    # The reminder: written by the Coordinator, delivered by the Notification
    # Sender, visible in the same feed the Schedule page reads.
    feed = client.get("/api/v1/notifications").json()
    assert len(feed) == 1
    assert TOP in feed[0]["body"]
    assert feed[0]["metadata"]["source"] == "coordinator"

    # The record: what was decided, why, and what the executor did.
    decisions = client.get(
        "/api/v1/coordinator/decisions", params={"projectId": str(project_id)}
    )
    assert decisions.status_code == 200
    rows = decisions.json()
    assert len(rows) == 1
    row = rows[0]
    assert set(row) == {
        "id",
        "projectId",
        "eventType",
        "eventPayload",
        "action",
        "target",
        "reason",
        "urgency",
        "effect",
        "createdAt",
    }
    assert row["action"] == "NOTIFY"
    assert row["target"] == TOP
    assert row["urgency"] == "normal"
    assert row["eventType"] == "learner_state.updated"
    assert row["eventPayload"]["verdict"] == "correct"
    assert row["effect"].startswith("notification_sent:")
    assert row["reason"].strip()


def test_a_single_rubric_judgement_decides_nothing_and_says_why(authed_client):
    client, _user_id, project_id = authed_client

    assert (
        client.post(
            "/api/v1/knowledge/evidence", json=_evidence(project_id, tier="B")
        ).status_code
        == 201
    )

    rows = client.get("/api/v1/coordinator/decisions").json()
    assert rows[0]["action"] == "NO_ACTION"
    assert rows[0]["effect"] == "nothing_to_do"
    assert client.get("/api/v1/notifications").json() == []


def test_the_log_is_scoped_to_the_caller(authed_client):
    client, _user_id, project_id = authed_client
    client.post("/api/v1/knowledge/evidence", json=_evidence(project_id))

    # A project that is not the caller's is a 404, not an empty list.
    assert (
        client.get(
            "/api/v1/coordinator/decisions", params={"projectId": str(uuid.uuid4())}
        ).status_code
        == 404
    )


# --- the dry run ------------------------------------------------------------


def test_explain_shows_the_snapshot_and_the_decision_without_acting(authed_client):
    client, _user_id, project_id = authed_client
    client.post("/api/v1/knowledge/evidence", json=_evidence(project_id))

    structure = client.get(
        "/api/v1/knowledge/structure", params={"projectId": str(project_id)}
    ).json()
    item_id = next(row["id"] for row in structure["items"] if row["label"] == MIDDLE)

    response = client.get(
        "/api/v1/coordinator/explain",
        params={"projectId": str(project_id), "itemId": item_id, "source": "chat"},
    )
    assert response.status_code == 200, response.text
    body = response.json()

    assert set(body) == {"snapshot", "decision"}
    snapshot = body["snapshot"]
    assert snapshot["focus"]["label"] == MIDDLE
    assert snapshot["focus"]["value"] == "mastered"
    assert snapshot["focus"]["previousValue"] == "unassessed"
    assert snapshot["ready"] == [TOP]
    assert snapshot["mastered"] == [BASE, MIDDLE]
    assert snapshot["availableActions"] == [
        "NO_ACTION",
        "CONTINUE",
        "REVIEW",
        "INTRODUCE",
        "NOTIFY",
    ]
    assert snapshot["goal"] is None
    # source=chat: the same state, delivered to the conversation.
    assert body["decision"]["action"] == "INTRODUCE"
    assert body["decision"]["target"] == TOP

    # A dry run decides and touches nothing: still the one decision and the one
    # reminder the evidence write produced (asserted over HTTP on purpose — a
    # direct `asyncio.run` here would fight the TestClient's event loop; the
    # table-level version of this claim lives in test_coordinator_db.py).
    assert len(client.get("/api/v1/coordinator/decisions").json()) == 1
    assert len(client.get("/api/v1/notifications").json()) == 1


def test_explain_refuses_a_source_it_does_not_have(authed_client):
    client, _user_id, project_id = authed_client
    response = client.get(
        "/api/v1/coordinator/explain",
        params={"projectId": str(project_id), "source": "telepathy"},
    )
    assert response.status_code == 422
    assert "telepathy" in response.json()["detail"]
