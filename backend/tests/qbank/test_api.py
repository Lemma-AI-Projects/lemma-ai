"""HTTP-level guards that need no database."""

import uuid

import pytest
from fastapi.testclient import TestClient

from core.config import settings
from core.security import CurrentUser, get_current_user
from main import app

_USER = CurrentUser(id=uuid.UUID("11111111-1111-1111-1111-111111111111"), email=None)


@pytest.fixture
def client() -> TestClient:
    app.dependency_overrides[get_current_user] = lambda: _USER
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def test_admin_entry_is_404_outside_allow_list(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "qbank_admin_user_ids", "")
    response = client.post("/api/v1/qbank/admin/question-sets", json={"xkwCourseId": 27})
    assert response.status_code == 404
    assert client.get("/api/v1/qbank/admin/catalog/courses").status_code == 404


def test_admin_entry_disabled_by_master_switch(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "qbank_admin_user_ids", str(_USER.id))
    monkeypatch.setattr(settings, "qbank_xkw_enabled", False)
    response = client.post("/api/v1/qbank/admin/question-sets", json={"xkwCourseId": 27})
    assert response.status_code == 503 and response.json()["detail"] == "qbank_disabled"


def test_submission_body_is_validated(client: TestClient) -> None:
    set_id = uuid.uuid4()
    empty = client.post(f"/api/v1/question-sets/{set_id}/submissions", json={"submissions": []})
    assert empty.status_code == 422
    wrong_kind = client.post(
        f"/api/v1/question-sets/{set_id}/submissions",
        json={
            "submissions": [
                {
                    "questionId": "q_x",
                    "contentVersion": "1.x",
                    "responses": [{"slotId": "q_x:bk", "response": {"kind": "nope"}}],
                }
            ]
        },
    )
    assert wrong_kind.status_code == 422
