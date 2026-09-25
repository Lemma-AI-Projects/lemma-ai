"""Answering sessions, server-side grading and result persistence.

The session is implicit (拍板 D12): the learner's `open` session on a set is
found or created on submit, so the client sends no session id.

- batch: all submissions are checked first (content versions, duplicates,
  already-submitted) and the whole group is rejected on any failure; grading
  and writes happen in one transaction, then the session is closed.
- immediate: one question per call; re-submitting a question in the same
  session is 409 already_submitted; the session closes when every question
  of the set has a result.

Reference answers (review_json) leave the server only here, inside results.
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models.question_attempt import QuestionAttempt, QuestionSetAttempt
from qbank.grading import GradeResult, InvalidSubmission, grade
from schemas.question import AttemptResult, AttemptSubmission, OpenAttempt
from services import question_set_service
from services.question_set_service import QuestionSetError, SetItem

_OPEN = "open"
_SUBMITTED = "submitted"


def _invalid(message: str) -> QuestionSetError:
    return QuestionSetError("invalid_submission", 422, message)


async def _open_session(
    db: AsyncSession, *, user_id: uuid.UUID, set_id: uuid.UUID, mode: str
) -> QuestionSetAttempt:
    query = select(QuestionSetAttempt).where(
        QuestionSetAttempt.user_id == user_id,
        QuestionSetAttempt.question_set_id == set_id,
        QuestionSetAttempt.status == _OPEN,
    )
    session = (await db.execute(query)).scalar_one_or_none()
    if session is not None:
        return session
    session = QuestionSetAttempt(user_id=user_id, question_set_id=set_id, mode=mode, status=_OPEN)
    db.add(session)
    try:
        async with db.begin_nested():
            await db.flush()
    except IntegrityError:
        # A concurrent submit opened it first (partial unique index).
        return (await db.execute(query)).scalar_one()
    return session


def _result_payload(
    attempt: QuestionAttempt, item: SetItem, session_id: uuid.UUID
) -> AttemptResult:
    return AttemptResult.model_validate(
        {
            "attemptId": attempt.id,
            "questionId": item.question_key,
            "status": attempt.status,
            "score": (
                {"earned": attempt.score_earned, "total": attempt.score_total}
                if attempt.score_total is not None
                else None
            ),
            "slots": attempt.slot_results_json,
            "review": item.review,
            "submittedAt": attempt.submitted_at,
            "attemptSessionId": session_id,
        }
    )


def _slot_results(result: GradeResult) -> list[dict[str, Any]]:
    return [
        {
            "slotId": slot.slot_id,
            "verdict": slot.verdict,
            "response": slot.response,
            "score": slot.score,
            "feedback": None,
        }
        for slot in result.slots
    ]


async def submit(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    set_id: uuid.UUID,
    submissions: list[AttemptSubmission],
) -> list[AttemptResult]:
    question_set = await question_set_service.get_owned_set(db, user_id=user_id, set_id=set_id)
    if question_set is None:
        raise question_set_service.not_found()
    if question_set.status != question_set_service.STATUS_READY:
        raise _invalid("question set is not ready")

    items = {item.question_key: item for item in await question_set_service.load_grading_items(db, set_id=set_id)}
    if question_set.mode == "immediate" and len(submissions) != 1:
        raise _invalid("immediate mode submits one question at a time")

    seen: set[str] = set()
    for submission in submissions:
        if submission.question_id not in items:
            raise _invalid(f"question {submission.question_id} is not in this set")
        if submission.question_id in seen:
            raise _invalid(f"question {submission.question_id} submitted twice")
        seen.add(submission.question_id)
    # Atomic: any stale version rejects the whole group before anything is graded.
    for submission in submissions:
        if submission.content_version != items[submission.question_id].content_version:
            raise QuestionSetError("content_version_mismatch", 409)

    session = await _open_session(db, user_id=user_id, set_id=set_id, mode=question_set.mode)
    answered = set(
        (
            await db.execute(
                select(QuestionAttempt.question_version_id).where(
                    QuestionAttempt.attempt_session_id == session.id
                )
            )
        ).scalars()
    )
    for submission in submissions:
        if items[submission.question_id].version_id in answered:
            raise QuestionSetError("already_submitted", 409)

    now = datetime.now(UTC)
    graded: list[tuple[QuestionAttempt, SetItem]] = []
    for submission in submissions:
        item = items[submission.question_id]
        entries = [entry.model_dump(by_alias=True, mode="json") for entry in submission.responses]
        try:
            result = grade(
                item.slot_map, entries, slot_order=item.slot_order, structure=item.structure
            )
        except InvalidSubmission as exc:
            await db.rollback()
            raise _invalid(str(exc)) from exc
        attempt = QuestionAttempt(
            attempt_session_id=session.id,
            question_version_id=item.version_id,
            responses_json=entries,
            slot_results_json=_slot_results(result),
            score_earned=result.score["earned"] if result.score else None,
            score_total=result.score["total"] if result.score else None,
            status=result.status,
            client_submitted_at=submission.client_submitted_at,
            submitted_at=now,
            graded_at=now if result.status != "pending" else None,
        )
        db.add(attempt)
        graded.append((attempt, item))

    answered_count = len(answered) + len(graded)
    if question_set.mode == "batch" or answered_count >= len(items):
        session.status = _SUBMITTED
        session.submitted_at = now
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise QuestionSetError("already_submitted", 409) from exc
    results = [_result_payload(attempt, item, session.id) for attempt, item in graded]
    await db.commit()
    return results


async def open_attempt(
    db: AsyncSession, *, user_id: uuid.UUID, set_id: uuid.UUID
) -> OpenAttempt | None:
    """Results already submitted in the learner's open session (immediate
    mode resumes after a refresh). Ownership is checked by the caller."""
    session = (
        await db.execute(
            select(QuestionSetAttempt).where(
                QuestionSetAttempt.user_id == user_id,
                QuestionSetAttempt.question_set_id == set_id,
                QuestionSetAttempt.status == _OPEN,
            )
        )
    ).scalar_one_or_none()
    if session is None:
        return None
    attempts = list(
        (
            await db.execute(
                select(QuestionAttempt).where(QuestionAttempt.attempt_session_id == session.id)
            )
        ).scalars()
    )
    if not attempts:
        return OpenAttempt(attempt_session_id=session.id, results=[])
    items = {
        item.version_id: item
        for item in await question_set_service.load_grading_items(db, set_id=set_id)
    }
    return OpenAttempt(
        attempt_session_id=session.id,
        results=[
            _result_payload(attempt, items[attempt.question_version_id], session.id)
            for attempt in attempts
            if attempt.question_version_id in items
        ],
    )
