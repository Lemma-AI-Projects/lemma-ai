"""Doc-layer REST endpoints.

Resources are the page (a section owned by a learn space) and its blocks (the
editor stream). Ownership is enforced at the service layer: a foreign project_id
or a page outside the caller's projects is 404, and a stale block save is 409 —
never a silent overwrite.

Two read surfaces:
  - /pages?project_id=   → one owned learn space's pages (shelter drawer)
  - /pages               → all the caller's pages + project names (/knowledge)
One write surface beyond plain CRUD: POST /pages/import, which turns a text
file's bytes into a 「资料」 board (text only, no object storage — see the
execution plan §8 for why binaries are refused rather than half-supported).
"""

import re
import uuid
from pathlib import Path
from urllib.parse import unquote

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.security import CurrentUser, get_current_user
from schemas.doc import (
    BlocksPutIn,
    PageBlocksOut,
    PageCreateIn,
    PageOut,
    PageUpdateIn,
    PageWithProjectOut,
)
from services import doc_service

# One text file, one request. 1 MB is ~500k Chinese characters — far past any
# board a person reads in a chat, and small enough to decode in memory.
IMPORT_MAX_BYTES = 1024 * 1024

_LEADING_H1_RE = re.compile(r"^#\s+(.*)$")
_CHARSET_RE = re.compile(r"charset=([A-Za-z0-9_-]+)", re.IGNORECASE)

_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="page_not_found"
)
_STALE = HTTPException(
    status_code=status.HTTP_409_CONFLICT, detail="page_stale_version"
)
_DISABLED = HTTPException(
    status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="doc_api_disabled"
)


def _doc_api_gate() -> None:
    """Keep the whole write surface read-only until the pages/blocks tables exist
    (migration gated by DOC_FULL_API_ENABLED). Fail fast with 503, not a 500 from
    a missing table, so the client can tell 'disabled' from 'broken'."""
    if not settings.doc_full_api_enabled:
        raise _DISABLED


router = APIRouter(
    prefix="/pages",
    tags=["pages"],
    dependencies=[Depends(_doc_api_gate)],
)


def _to_out(page) -> PageOut:
    return PageOut(
        id=page.id,
        project_id=page.project_id,
        parent_page_id=page.parent_page_id,
        title=page.title,
        kind=page.kind,
        source=page.source,
        import_ref=page.import_ref,
        updated_at=page.updated_at,
    )


async def _owned_or_404(
    db: AsyncSession, user: CurrentUser, page_id: uuid.UUID
):
    page = await doc_service.get_owned_page(
        db, user_id=user.id, page_id=page_id
    )
    if page is None:
        raise _NOT_FOUND
    return page


@router.get("", response_model=list[PageWithProjectOut])
async def list_pages(
    # alias is load-bearing: the wire format is camelCase everywhere, and a bare
    # `project_id` here silently IGNORED the client's `projectId` — every space's
    # drawer then listed the user's pages from ALL spaces (found 2026-09-21 while
    # verifying, by asking for a space and getting a different one's boards).
    project_id: uuid.UUID | None = Query(default=None, alias="projectId"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PageWithProjectOut]:
    if project_id is not None:
        rows = await doc_service.list_project_pages(
            db, user_id=current_user.id, project_id=project_id
        )
        if rows is None:
            raise _NOT_FOUND
    else:
        rows = await doc_service.list_all_pages(db, user_id=current_user.id)
    return [
        PageWithProjectOut(
            id=page.id,
            project_id=page.project_id,
            project_name=name,
            parent_page_id=page.parent_page_id,
            title=page.title,
            kind=page.kind,
            source=page.source,
            import_ref=page.import_ref,
            updated_at=page.updated_at,
        )
        for page, name in rows
    ]


@router.post(
    "", response_model=PageOut, status_code=status.HTTP_201_CREATED
)
async def create_page(
    payload: PageCreateIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PageOut:
    page = await doc_service.create_page(
        db,
        user_id=current_user.id,
        project_id=payload.project_id,
        title=payload.title,
        kind=payload.kind,
        parent_page_id=payload.parent_page_id,
    )
    if page is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="project_not_found",
        )
    return _to_out(page)


def _charset_of(content_type: str | None) -> str:
    """Charset from Content-Type, defaulting to UTF-8 as the whole stack does."""
    match = _CHARSET_RE.search(content_type or "")
    return match.group(1) if match else "utf-8"


def _split_title(text: str, encoded_filename: str) -> tuple[str, str]:
    """(title, body) for an imported file.

    A leading `# Heading` names the board — it is consumed rather than kept as
    a block, otherwise every imported file opens by repeating its own title.
    With no heading the file name does the naming. Both fall back to a plain
    label rather than 400: an unnamed note is a cosmetic problem, a refused
    import is a lost one.
    """
    body = text[1:] if text.startswith("\ufeff") else text
    lines = body.split("\n")
    for index, line in enumerate(lines):
        if not line.strip():
            continue
        heading = _LEADING_H1_RE.match(line.strip())
        if heading:
            title = heading.group(1).strip()[: doc_service.PAGE_TITLE_MAX]
            rest = "\n".join(lines[:index] + lines[index + 1 :])
            return title or "导入的资料", rest
        break
    stem = Path(unquote(encoded_filename)).stem if encoded_filename else ""
    return stem.strip()[: doc_service.PAGE_TITLE_MAX] or "导入的资料", body


@router.post(
    "/import", response_model=PageBlocksOut, status_code=status.HTTP_201_CREATED
)
async def import_page(
    request: Request,
    project_id: uuid.UUID = Query(alias="projectId"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PageBlocksOut:
    """Import one text file as a new 「资料」 board in an owned space.

    Raw body, not multipart: V1 takes text only, and `python-multipart` is not
    installed on this backend — pulling in a dependency to receive a .md file
    is a bad trade. The file name travels URL-encoded in X-File-Name so
    non-ASCII names survive header transport; Content-Type is read only for
    its charset.

    Refusals are explicit (400 empty / 413 too large / 415 not decodable as
    text) so the client can say what went wrong. Nothing is written to object
    storage and the parse happens in memory — see the plan §8 for why binaries
    are out of scope rather than half-supported.
    """
    raw = await request.body()
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="empty_body"
        )
    if len(raw) > IMPORT_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="file_too_large",
        )
    try:
        text = raw.decode(_charset_of(request.headers.get("content-type")))
    except (UnicodeDecodeError, LookupError):
        # LookupError covers an unknown charset label; both mean "not text
        # we can hold", which is the one case V1 genuinely cannot serve.
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="unsupported_encoding",
        ) from None

    title, body = _split_title(text, request.headers.get("x-file-name", ""))
    blocks = doc_service.markdown_to_blocks(body)
    if not blocks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="empty_text"
        )
    created = await doc_service.create_page_with_blocks(
        db,
        user_id=current_user.id,
        project_id=project_id,
        title=title,
        blocks=blocks,
        kind="imported",
        source="upload",
    )
    if created is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="project_not_found"
        )
    page, saved = created
    return PageBlocksOut(
        id=page.id,
        project_id=page.project_id,
        title=page.title,
        kind=page.kind,
        updated_at=page.updated_at,
        blocks=[
            {
                "id": block.id,
                "type": block.type,
                "position": block.position,
                "content": block.content,
                "meta": block.meta,
            }
            for block in saved
        ],
    )


@router.get("/{page_id}", response_model=PageOut)
async def get_page(
    page_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PageOut:
    return _to_out(await _owned_or_404(db, current_user, page_id))


@router.put("/{page_id}", response_model=PageOut)
async def update_page(
    page_id: uuid.UUID,
    payload: PageUpdateIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PageOut:
    page = await _owned_or_404(db, current_user, page_id)
    updated = await doc_service.update_page(
        db,
        page,
        title=payload.title,
        kind=payload.kind,
        parent_page_id=payload.parent_page_id,
    )
    return _to_out(updated)


@router.delete("/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page(
    page_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    page = await _owned_or_404(db, current_user, page_id)
    await doc_service.delete_page(db, page)


@router.get("/{page_id}/blocks", response_model=PageBlocksOut)
async def get_page_blocks(
    page_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PageBlocksOut:
    loaded = await doc_service.get_page_blocks(
        db, user_id=current_user.id, page_id=page_id
    )
    if loaded is None:
        raise _NOT_FOUND
    page, blocks = loaded
    return PageBlocksOut(
        id=page.id,
        project_id=page.project_id,
        title=page.title,
        kind=page.kind,
        updated_at=page.updated_at,
        blocks=[
            {
                "id": b.id,
                "type": b.type,
                "position": b.position,
                "content": b.content,
                "meta": b.meta,
            }
            for b in blocks
        ],
    )


@router.put("/{page_id}/blocks", response_model=PageBlocksOut)
async def save_page_blocks(
    page_id: uuid.UUID,
    payload: BlocksPutIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PageBlocksOut:
    page = await _owned_or_404(db, current_user, page_id)
    saved = await doc_service.save_page_blocks(
        db,
        page,
        blocks=[block.model_dump() for block in payload.blocks],
        expected_updated_at=payload.updated_at,
    )
    if saved is None:
        raise _STALE
    return PageBlocksOut(
        id=saved.id,
        project_id=saved.project_id,
        title=saved.title,
        kind=saved.kind,
        updated_at=saved.updated_at,
        blocks=[
            {
                "id": b["id"],
                "type": b["type"],
                "position": b["position"],
                "content": b["content"],
                "meta": b.get("meta"),
            }
            for b in payload.blocks
        ],
    )