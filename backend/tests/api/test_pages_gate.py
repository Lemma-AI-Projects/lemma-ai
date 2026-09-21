"""The doc-layer gate: the /pages surface answers 503, never a missing-table 500.

The gate is the only thing between a not-yet-migrated deployment and a wall of
"relation pages does not exist". It was verified by hand once — which means
nothing guarded it. This is the guard.

No database is touched: the gate raises before any handler runs, which is
exactly the property being tested.
"""

import uuid

import pytest
from fastapi.testclient import TestClient

from core.config import settings
from main import app


@pytest.fixture()
def client():
    # raise_server_exceptions=False so an unexpected 500 surfaces as a status
    # code in the assertion instead of a traceback that hides which call failed.
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


def test_pages_surface_answers_503_when_disabled(client, monkeypatch):
    monkeypatch.setattr(settings, "doc_full_api_enabled", False)
    project_id = str(uuid.uuid4())

    calls = [
        ("get", "/api/v1/pages", {"params": {"projectId": project_id}}),
        (
            "post",
            "/api/v1/pages",
            {"json": {"projectId": project_id, "title": "x"}},
        ),
        ("get", f"/api/v1/pages/{uuid.uuid4()}", {}),
        (
            "post",
            "/api/v1/pages/import",
            {"params": {"projectId": project_id}, "content": b"# title\n\nbody"},
        ),
    ]
    for method, url, kwargs in calls:
        response = getattr(client, method)(url, **kwargs)
        assert response.status_code == 503, (method, url, response.status_code)
        assert response.json()["detail"] == "doc_api_disabled", url


def test_gate_is_what_produces_503(client, monkeypatch):
    """Flip the flag and the SAME request gets past the gate.

    Without this, a 503 caused by any other accident (a broken dependency, a
    wrong route prefix) would keep the test above green.
    """
    monkeypatch.setattr(settings, "doc_full_api_enabled", True)
    response = client.get(
        "/api/v1/pages", params={"projectId": str(uuid.uuid4())}
    )
    assert response.status_code != 503
