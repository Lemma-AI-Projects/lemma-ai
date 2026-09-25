"""Developer entry for the question bank (QBANK_ADMIN_USER_IDS only).

Anyone outside the allow-list gets 404 — the endpoints don't admit to
existing. Building a set never calls XKW on the request path: it creates the
set (generating) and enqueues qbank.build_set; catalog reads come from the
local cache and enqueue a fetch on a miss.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.security import CurrentUser, get_current_user
from qbank.types import BuildSpec
from schemas.question import CatalogOut, QuestionSetBuildIn, QuestionSetSummary
from services import qbank_catalog_service, question_set_service

router = APIRouter(prefix="/qbank/admin", tags=["qbank-admin"])


async def require_qbank_admin(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    if str(current_user.id).lower() not in settings.qbank_admin_user_id_set:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    return current_user


@router.post(
    "/question-sets",
    response_model=QuestionSetSummary,
    status_code=status.HTTP_202_ACCEPTED,
)
async def build_question_set(
    payload: QuestionSetBuildIn,
    admin: CurrentUser = Depends(require_qbank_admin),
    db: AsyncSession = Depends(get_db),
) -> QuestionSetSummary:
    if not settings.qbank_xkw_enabled:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="qbank_disabled")
    spec = BuildSpec(
        xkw_course_id=payload.xkw_course_id,
        kpoint_ids=payload.kpoint_ids,
        catalog_ids=payload.catalog_ids,
        type_ids=payload.type_ids,
        difficulty_levels=list(payload.difficulty_levels),
        count=payload.count,
    )
    question_set = await question_set_service.create_set(
        db, user_id=admin.id, spec=spec, kind=payload.kind, mode=payload.mode, title=payload.title
    )
    # Lazy import: tasks import services.
    from tasks.question_set_build import build_question_set as build_task

    build_task.delay(str(question_set.id))
    return QuestionSetSummary(
        id=question_set.id,
        title=question_set.title,
        kind=question_set.kind,  # type: ignore[arg-type]
        mode=question_set.mode,  # type: ignore[arg-type]
        question_count=0,
        status=question_set.status,  # type: ignore[arg-type]
    )


async def _catalog(db: AsyncSession, kind: str, key: str) -> CatalogOut:
    entry = await qbank_catalog_service.get(db, kind=kind, key=key)
    if entry is None:
        qbank_catalog_service.enqueue_fetch(kind, key)
        return CatalogOut(status="syncing", items=[])
    return CatalogOut(status="ready", items=entry.items, fetched_at=entry.fetched_at)


@router.get("/catalog/courses", response_model=CatalogOut)
async def catalog_courses(
    _admin: CurrentUser = Depends(require_qbank_admin),
    db: AsyncSession = Depends(get_db),
) -> CatalogOut:
    return await _catalog(db, qbank_catalog_service.KIND_COURSES, qbank_catalog_service.COURSES_KEY)


@router.get("/catalog/courses/{course_id}/question-types", response_model=CatalogOut)
async def catalog_question_types(
    course_id: int,
    _admin: CurrentUser = Depends(require_qbank_admin),
    db: AsyncSession = Depends(get_db),
) -> CatalogOut:
    return await _catalog(db, qbank_catalog_service.KIND_QUESTION_TYPES, str(course_id))


@router.get("/catalog/courses/{course_id}/knowledge-tree", response_model=CatalogOut)
async def catalog_knowledge_tree(
    course_id: int,
    _admin: CurrentUser = Depends(require_qbank_admin),
    db: AsyncSession = Depends(get_db),
) -> CatalogOut:
    return await _catalog(db, qbank_catalog_service.KIND_KNOWLEDGE_TREE, str(course_id))
