"""Doc-layer REST endpoints.

Resources are the page (a section owned by a learn space) and its blocks (the
editor stream). Ownership is enforced at the service layer: a foreign project_id
or a page outside the caller's projects is 404, and a stale block save is 409 —
never a silent overwrite.

Two read surfaces:
  - /pages?project_id=   → one owned learn space's pages (shelter drawer)
  - /pages               → all the caller's pages + project names (/knowledge)
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
    project_id: uuid.UUID | None = Query(default=None),
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