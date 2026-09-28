"""资料上传这条链路：从字节到行、从行回字节。

新增一个写面就该有一条测试看着它，尤其这一条横跨三样东西：**磁盘上的字节**、
**数据库里的行**、以及一个**不该出现在响应里的列**（`storage_key`）。所以这里断言
三件事：

  * 上传落成一块 `imported` / `upload` 的板子，类型与原名都在；
  * 同样的字节能原样读回来 —— 这是"文件真的在"的唯一证据；
  * 拿不到的就明确拿不到：白名单外的类型 415、空 body 400、别人的空间 404，
    而且**失败时磁盘上不留孤儿字节**（不然一次越权尝试会悄悄占掉用户的空间）。

Auth is the only thing faked (a `CurrentUser` in place of a token). Storage is
pointed at a tmp dir, so `backend/var/` never receives test bytes.
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from core.config import settings
from core.database import AsyncSessionLocal, engine, get_db
from core.security import CurrentUser, get_current_user
from main import app
from services import material_storage

PAGES = "/api/v1/pages"

# 一页最小但合法的 PDF：字节内容本身不重要，重要的是它会被原样存、原样取。
PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"
# 「论文.pdf」的 URL 编码形式（HTTP 头只能放 latin-1）。
NAME_HEADER = "%E8%AE%BA%E6%96%87.pdf"


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


async def _create() -> tuple[uuid.UUID, uuid.UUID, uuid.UUID]:
    user_a, user_b, space_a = (uuid.uuid4() for _ in range(3))
    async with engine.begin() as conn:
        for user_id, tag in ((user_a, "a"), (user_b, "b")):
            email = f"page-materials-{tag}-{user_id}@example.test"
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
            {"id": space_a, "u": user_a, "n": "page-materials-A"},
        )
    return user_a, user_b, space_a


async def _drop(*user_ids: uuid.UUID) -> None:
    async with engine.begin() as conn:
        for user_id in user_ids:
            await conn.execute(
                text("delete from auth.users where id = :id"), {"id": user_id}
            )


@pytest.fixture
def world():
    """(user_a, user_b, space_a) — space_a belongs to a, and b owns nothing."""

    async def _probe():
        async with engine.connect() as conn:
            await conn.execute(text("select 1"))

    try:
        run(_probe())
    except Exception as exc:  # noqa: BLE001 — any failure means "no database here"
        pytest.skip(f"no database reachable: {type(exc).__name__}: {exc}")

    ids = run(_create())
    yield ids
    run(_drop(ids[0], ids[1]))


@pytest.fixture
def storage_root(tmp_path, monkeypatch):
    """Point the material storage at a tmp dir: test bytes never reach backend/var."""
    root = tmp_path / "materials"
    monkeypatch.setattr(material_storage, "root", lambda: root)
    return root


@pytest.fixture
def enabled(monkeypatch):
    monkeypatch.setattr(settings, "doc_full_api_enabled", True)


@pytest.fixture
def act_as():
    """`act_as(user_id)` -> a client whose caller is that user."""

    def _open(user_id: uuid.UUID) -> TestClient:
        async def _session():
            async with AsyncSessionLocal() as session:
                yield session

        app.dependency_overrides[get_current_user] = lambda: CurrentUser(
            id=user_id, email=None
        )
        app.dependency_overrides[get_db] = _session
        return TestClient(app, raise_server_exceptions=False)

    yield _open
    app.dependency_overrides.clear()


def _upload(client: TestClient, space_id: uuid.UUID, *, mime: str = "application/pdf",
            content: bytes = PDF_BYTES, name: str = NAME_HEADER):
    return client.post(
        f"{PAGES}/upload",
        params={"projectId": str(space_id)},
        content=content,
        headers={"Content-Type": mime, "X-File-Name": name},
    )


def test_upload_lands_a_material_board_and_the_bytes_come_back(
    world, act_as, storage_root, enabled
):
    user_a, _user_b, space_a = world
    with act_as(user_a) as client:
        response = _upload(client, space_a)
        assert response.status_code == 201, response.text
        body = response.json()

        assert body["kind"] == "imported"
        assert body["source"] == "upload"
        assert body["originalName"] == "论文.pdf"
        assert body["mime"] == "application/pdf"
        assert body["title"] == "论文"  # 标题取原名的 stem，扩展名不进标题
        # 存储的键是服务端的实现细节，wire 上不该有它。
        assert "storageKey" not in body

        # 字节真的落到了盘上（不是只写了一行）。
        assert list(storage_root.rglob("*.pdf"))

        fetched = client.get(f"{PAGES}/{body['id']}/file")
        assert fetched.status_code == 200, fetched.text
        assert fetched.content == PDF_BYTES
        assert fetched.headers["content-type"].startswith("application/pdf")

        # 同一块板子也出现在空间列表里（网格就是读这一份）。
        listed = client.get(PAGES, params={"projectId": str(space_a)})
        assert listed.status_code == 200
        assert [page["id"] for page in listed.json()] == [body["id"]]


def test_a_type_outside_the_whitelist_is_refused_and_leaves_nothing(
    world, act_as, storage_root, enabled
):
    user_a, _user_b, space_a = world
    with act_as(user_a) as client:
        response = _upload(
            client, space_a, mime="text/csv", content=b"a,b\n1,2\n", name="t.csv"
        )
        assert response.status_code == 415, response.text
        # 拒绝要"干净"：没有板子，也没有字节。
        assert client.get(PAGES, params={"projectId": str(space_a)}).json() == []
    assert not list(storage_root.rglob("*")) if storage_root.exists() else True


def test_an_empty_body_is_refused(world, act_as, storage_root, enabled):
    user_a, _user_b, space_a = world
    with act_as(user_a) as client:
        response = _upload(client, space_a, content=b"")
        assert response.status_code == 400, response.text


def test_another_persons_space_cannot_be_written_to(
    world, act_as, storage_root, enabled
):
    _user_a, user_b, space_a = world
    with act_as(user_b) as client:
        response = _upload(client, space_a)
        assert response.status_code == 404, response.text
        # 越权尝试不该在磁盘上留下任何字节（连空目录也不该留 —— `delete` 会顺手收掉）。
        assert not storage_root.exists() or not list(storage_root.rglob("*"))
        # 他自己的列表里当然也没有这块板（b 一个空间都没有）。
        assert client.get(PAGES).json() == []


def test_a_foreign_material_cannot_be_read(world, act_as, storage_root, enabled):
    user_a, user_b, space_a = world
    with act_as(user_a) as client:
        created = _upload(client, space_a).json()

    with act_as(user_b) as client:
        assert client.get(f"{PAGES}/{created['id']}/file").status_code == 404
