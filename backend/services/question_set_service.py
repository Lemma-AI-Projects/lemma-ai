"""Question sets: ownership, lifecycle and the answer-view snapshot.

IDOR red line (same as conversations/courses): every query that touches a set
by id also filters by user_id; "not yours" and "not there" are both None ->
404. Question content is reachable only through a set the caller owns.

Answer-view queries select `view_json` only — review_json (reference answers)
is never read on this path.
"""

import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.question import QuestionVersion
from models.question_set import QuestionSet, QuestionSetItem
from qbank.types import BuildSpec
from schemas.question import OpenAttempt, QuestionSetSummary, QuestionSetView

STATUS_GENERATING = "generating"
STATUS_READY = "ready"
STATUS_EMPTY = "empty"
STATUS_FAILED = "failed"
ORIGIN_DEV = "dev"


class QuestionSetError(Exception):
    """A business error the API maps to an HTTP status + stable code."""

    def __init__(self, code: str, status_code: int, message: str = "") -> None:
        super().__init__(message or code)
        self.code = code
        self.status_code = status_code


def not_found() -> QuestionSetError:
    return QuestionSetError("not_found", 404)


async def create_set(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    spec: BuildSpec,
    kind: str,
    mode: str,
    title: str | None,
) -> QuestionSet:
    question_set = QuestionSet(
        user_id=user_id,
        kind=kind,
        mode=mode,
        title=title or f"学科网题组 · 课程 {spec.xkw_course_id}",
        status=STATUS_GENERATING,
        origin_kind=ORIGIN_DEV,
        query_spec_json=spec.model_dump(),
        spec_hash=spec.spec_hash(),
    )
    db.add(question_set)
    await db.commit()
    await db.refresh(question_set)
    return question_set


async def get_owned_set(
    db: AsyncSession, *, user_id: uuid.UUID, set_id: uuid.UUID
) -> QuestionSet | None:
    result = await db.execute(
        select(QuestionSet).where(QuestionSet.id == set_id, QuestionSet.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def list_sets(
    db: AsyncSession, *, user_id: uuid.UUID, limit: int = 50, offset: int = 0
) -> list[QuestionSetSummary]:
    count = (
        select(func.count(QuestionSetItem.id))
        .where(QuestionSetItem.question_set_id == QuestionSet.id)
        .scalar_subquery()
    )
    rows = await db.execute(
        select(QuestionSet, count)
        .where(QuestionSet.user_id == user_id)
        .order_by(QuestionSet.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return [
        QuestionSetSummary(
            id=question_set.id,
            title=question_set.title,
            kind=question_set.kind,  # type: ignore[arg-type]
            mode=question_set.mode,  # type: ignore[arg-type]
            question_count=question_count or 0,
            status=question_set.status,  # type: ignore[arg-type]
        )
        for question_set, question_count in rows.all()
    ]


@dataclass
class SetItem:
    """One pinned question of a set, with what grading needs (service-internal)."""

    version_id: uuid.UUID
    question_key: str
    content_version: str
    structure: str
    slot_map: dict[str, Any]
    review: dict[str, Any]
    slot_order: list[str]


def _slot_order(view: dict[str, Any]) -> list[str]:
    return [
        slot["id"]
        for slot in [
            *view.get("slots", []),
            *(slot for sub in view.get("subQuestions", []) for slot in sub.get("slots", [])),
        ]
    ]


async def load_views(db: AsyncSession, *, set_id: uuid.UUID) -> list[dict[str, Any]]:
    """The set's answer views in order. Selects view_json ONLY."""
    rows = await db.execute(
        select(QuestionVersion.view_json)
        .join(QuestionSetItem, QuestionSetItem.question_version_id == QuestionVersion.id)
        .where(QuestionSetItem.question_set_id == set_id)
        .order_by(QuestionSetItem.order_index)
    )
    return [row[0] for row in rows.all()]


async def load_grading_items(db: AsyncSession, *, set_id: uuid.UUID) -> list[SetItem]:
    """Grading-side read (includes review + slot map). Submission path only."""
    rows = await db.execute(
        select(
            QuestionVersion.id,
            QuestionVersion.view_json,
            QuestionVersion.content_version,
            QuestionVersion.structure,
            QuestionVersion.slot_map_json,
            QuestionVersion.review_json,
        )
        .join(QuestionSetItem, QuestionSetItem.question_version_id == QuestionVersion.id)
        .where(QuestionSetItem.question_set_id == set_id)
        .order_by(QuestionSetItem.order_index)
    )
    return [
        SetItem(
            version_id=row[0],
            question_key=row[1]["id"],
            content_version=row[2],
            structure=row[3],
            slot_map=row[4],
            review=row[5],
            slot_order=_slot_order(row[1]),
        )
        for row in rows.all()
    ]


def build_view(
    question_set: QuestionSet,
    views: list[dict[str, Any]],
    open_attempt: OpenAttempt | None,
) -> QuestionSetView:
    ready = question_set.status == STATUS_READY
    questions = views if ready else []
    return QuestionSetView.model_validate(
        {
            "id": question_set.id,
            "title": question_set.title,
            "kind": question_set.kind,
            "mode": question_set.mode,
            "status": question_set.status,
            "sections": [
                {
                    "id": f"{question_set.id}:section1",
                    "title": None,
                    "instructions": None,
                    "questionIds": [view["id"] for view in questions],
                }
            ],
            "questions": questions,
            "openAttempt": open_attempt.model_dump(by_alias=True) if open_attempt and ready else None,
        }
    )


async def mark_status(
    db: AsyncSession, *, set_id: uuid.UUID, status: str, error_type: str | None = None
) -> None:
    question_set = await db.get(QuestionSet, set_id)
    if question_set is None:
        return
    question_set.status = status
    question_set.error_type = error_type
    await db.commit()


async def set_items(db: AsyncSession, *, set_id: uuid.UUID, version_ids: list[uuid.UUID]) -> None:
    """Pin the chosen versions (idempotent: a retried build replaces them)."""
    existing = (
        await db.execute(select(QuestionSetItem).where(QuestionSetItem.question_set_id == set_id))
    ).scalars()
    for item in existing:
        await db.delete(item)
    await db.flush()
    for index, version_id in enumerate(version_ids):
        db.add(QuestionSetItem(question_set_id=set_id, question_version_id=version_id, order_index=index))
    await db.flush()


async def recent_empty_exists(db: AsyncSession, *, spec_hash: str, since: datetime) -> bool:
    """Same query came back empty recently -> don't pay to ask again."""
    result = await db.execute(
        select(QuestionSet.id)
        .where(
            QuestionSet.spec_hash == spec_hash,
            QuestionSet.status == STATUS_EMPTY,
            QuestionSet.created_at >= since,
        )
        .limit(1)
    )
    return result.first() is not None
