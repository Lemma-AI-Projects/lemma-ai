"""End-to-end smoke for the question bank on the real database, fixture
provider (offline, free).

Run (from backend/, with QBANK_XKW_PROVIDER=fixture):
    uv run python scripts/smoke_qbank.py --user-id <profile A> --other-user-id <profile B>

Builds a batch and an immediate set inline, reads the answer views, submits,
and checks IDOR (404), stale versions (409), duplicate immediate submits
(409), malformed submissions (422) and the open-session resume. The sets it
creates are deleted at the end; fetched questions stay (global content).
"""

import argparse
import asyncio
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, func, select

from core.config import settings
from core.database import AsyncSessionLocal, engine
from models.qbank_usage_log import QbankUsageLog
from models.question_set import QuestionSet
from qbank.types import BuildSpec
from schemas.question import AttemptSubmission
from services import question_attempt_service, question_set_service
from services.question_set_service import QuestionSetError
from tasks.question_set_build import run_build


def check(condition: bool, label: str) -> None:
    print(("PASS " if condition else "FAIL ") + label)
    if not condition:
        raise SystemExit(1)


def _first_answer(view: dict) -> list[dict]:
    """A response for every slot (choice -> first option, else empty)."""
    entries = []
    groups = {og["id"]: og for og in view["optionGroups"]}
    for sub in view["subQuestions"]:
        groups.update({og["id"]: og for og in sub["optionGroups"]})
    for slot in [*view["slots"], *(s for sub in view["subQuestions"] for s in sub["slots"])]:
        if slot["mechanism"] == "choice":
            option = groups[slot["optionGroupId"]]["options"][0]["id"]
            entries.append({"slotId": slot["id"], "response": {"kind": "choice", "optionIds": [option]}})
        elif slot["mechanism"] == "judge":
            entries.append({"slotId": slot["id"], "response": {"kind": "judge", "value": True}})
        else:
            entries.append({"slotId": slot["id"], "response": None})
    return entries


async def _build(user_id: uuid.UUID, mode: str) -> uuid.UUID:
    async with AsyncSessionLocal() as db:
        question_set = await question_set_service.create_set(
            db, user_id=user_id, spec=BuildSpec(xkw_course_id=0, count=5), kind="quiz", mode=mode, title=f"smoke {mode}"
        )
    status = await run_build(question_set.id)
    check(status == "ready", f"{mode} set built ready (got {status})")
    return question_set.id


async def _view(user_id: uuid.UUID, set_id: uuid.UUID):
    async with AsyncSessionLocal() as db:
        question_set = await question_set_service.get_owned_set(db, user_id=user_id, set_id=set_id)
        if question_set is None:
            return None
        views = await question_set_service.load_views(db, set_id=set_id)
        opened = await question_attempt_service.open_attempt(db, user_id=user_id, set_id=set_id)
        return question_set_service.build_view(question_set, views, opened)


async def _submit(user_id: uuid.UUID, set_id: uuid.UUID, submissions: list[dict]):
    async with AsyncSessionLocal() as db:
        return await question_attempt_service.submit(
            db,
            user_id=user_id,
            set_id=set_id,
            submissions=[AttemptSubmission.model_validate(s) for s in submissions],
        )


async def _expect_error(code: str, coro) -> None:  # noqa: ANN001
    try:
        await coro
    except QuestionSetError as error:
        check(error.code == code, f"error {code} (got {error.code})")
        return
    check(False, f"error {code} was raised")


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", required=True, type=uuid.UUID)
    parser.add_argument("--other-user-id", required=True, type=uuid.UUID)
    args = parser.parse_args()
    check(settings.qbank_xkw_provider == "fixture", "fixture provider (offline)")
    created: list[uuid.UUID] = []
    try:
        batch_id = await _build(args.user_id, "batch")
        created.append(batch_id)
        view = await _view(args.user_id, batch_id)
        check(view is not None and len(view.questions) == 5, "batch view has 5 questions")
        dumped = view.model_dump(by_alias=True, mode="json")
        check("referenceAnswers" not in str(dumped) and "answerFallback" not in str(dumped), "answer view leaks no answers")
        check(await _view(args.other_user_id, batch_id) is None, "other user cannot read the set (IDOR)")

        questions = dumped["questions"]
        submissions = [
            {"questionId": q["id"], "contentVersion": q["contentVersion"], "responses": _first_answer(q)}
            for q in questions
        ]
        stale = [dict(submissions[0], contentVersion="0.stale"), *submissions[1:]]
        await _expect_error("content_version_mismatch", _submit(args.user_id, batch_id, stale))
        await _expect_error("not_found", _submit(args.other_user_id, batch_id, submissions))
        bad = [dict(submissions[0], responses=[{"slotId": "nope", "response": None}])]
        await _expect_error("invalid_submission", _submit(args.user_id, batch_id, bad))

        results = await _submit(args.user_id, batch_id, submissions)
        check(len(results) == 5 and all(r.review is not None for r in results), "batch graded with reviews")
        check(all(r.status == "graded" for r in results), "every picked question is machine-graded")
        check((await _view(args.user_id, batch_id)).open_attempt is None, "batch session closed on submit")

        immediate_id = await _build(args.user_id, "immediate")
        created.append(immediate_id)
        view = (await _view(args.user_id, immediate_id)).model_dump(by_alias=True, mode="json")
        first = view["questions"][0]
        one = {"questionId": first["id"], "contentVersion": first["contentVersion"], "responses": _first_answer(first)}
        await _expect_error("invalid_submission", _submit(args.user_id, immediate_id, [one, one]))
        result = await _submit(args.user_id, immediate_id, [one])
        check(len(result) == 1, "immediate submit of one question")
        await _expect_error("already_submitted", _submit(args.user_id, immediate_id, [one]))
        resumed = await _view(args.user_id, immediate_id)
        check(
            resumed.open_attempt is not None and len(resumed.open_attempt.results) == 1,
            "open session resumes with its result after a refresh",
        )

        async with AsyncSessionLocal() as db:
            rows = (
                await db.execute(
                    select(func.count(QbankUsageLog.id)).where(
                        QbankUsageLog.question_set_id.in_(created)
                    )
                )
            ).scalar_one()
        check(rows >= 2, f"ledger rows written ({rows})")
    finally:
        async with AsyncSessionLocal() as db:
            await db.execute(delete(QuestionSet).where(QuestionSet.id.in_(created)))
            await db.commit()
        await engine.dispose()
    print("ALL PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
