"""Celery task: build one question set from its XKW query (qbank.build_set).

Flow: guards (master switch, global daily cap, recent-empty cache) -> fetch
up to QBANK_MAX_CALLS_PER_SET pages (count=10 each, one session_id so XKW
de-duplicates) -> store every question + parse it into a version -> keep the
fully machine-gradable objective ones -> pin `count` of them (3.. count-1
still makes a set; fewer is `empty`).

Celery 纪律 (mirrors course_organize): asyncio.run wraps the async body; the
provider is built per task and closed in finally; the module engine is
disposed so the next task starts clean. XKW verdicts (auth / forbidden / bad
request) are terminal -> `failed`; infra blips retry a bounded number of times,
then `failed` — a set never hangs in `generating`.
"""

import asyncio
import logging
import uuid
from datetime import UTC, datetime, timedelta

from core.config import settings
from core.database import AsyncSessionLocal, engine
from models.question_set import QuestionSet
from qbank.types import BuildSpec
from qbank.usage import count_billable_calls_since
from qbank.xkw.errors import XkwError
from qbank.xkw.provider import XkwProvider, build_provider
from qbank.xkw.types import CallContext, XkwQuestionRaw
from services import qbank_catalog_service, question_bank_service, question_set_service
from tasks.celery_app import celery_app

logger = logging.getLogger("lemma.tasks.question_set_build")

MIN_SET_SIZE = 3
_EMPTY_CACHE_WINDOW = timedelta(hours=24)
_INFRA_MAX_RETRIES = 3
_INFRA_RETRY_DELAY_S = 15
_USE_CASE = "question_set_build"


class _Terminal(Exception):
    def __init__(self, status: str, error_type: str | None) -> None:
        super().__init__(error_type or status)
        self.status = status
        self.error_type = error_type


async def _guard(set_id: uuid.UUID) -> tuple[QuestionSet, BuildSpec] | None:
    async with AsyncSessionLocal() as db:
        question_set = await db.get(QuestionSet, set_id)
        if question_set is None or question_set.status != question_set_service.STATUS_GENERATING:
            return None
        spec = BuildSpec.model_validate(question_set.query_spec_json)
        if not settings.qbank_xkw_enabled:
            raise _Terminal(question_set_service.STATUS_FAILED, "qbank_disabled")
        if await question_set_service.recent_empty_exists(
            db, spec_hash=spec.spec_hash(), since=datetime.now(UTC) - _EMPTY_CACHE_WINDOW
        ):
            raise _Terminal(question_set_service.STATUS_EMPTY, "recent_empty")
    if settings.qbank_xkw_provider == "http":
        since = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        if await count_billable_calls_since(since) >= settings.qbank_global_daily_call_cap:
            raise _Terminal(question_set_service.STATUS_FAILED, "daily_cap_reached")
    return question_set, spec


async def _store(
    raws: list[XkwQuestionRaw], *, course_id: int, provider_name: str
) -> list[uuid.UUID]:
    """Persist + parse; return the version ids usable in a set, in fetch order."""
    usable: list[uuid.UUID] = []
    storage_provider = question_bank_service.storage_provider(provider_name)
    async with AsyncSessionLocal() as db:
        objective_by_type = await qbank_catalog_service.objective_by_type_id(db, course_id=course_id)
        for raw in raws:
            objective = objective_by_type.get(raw.type_id or "")
            question = await question_bank_service.upsert_question(
                db, raw, objective=objective, provider=storage_provider
            )
            version = await question_bank_service.ensure_current_version(db, question)
            if version.fully_auto and question.objective is not False:
                usable.append(version.id)
        await db.commit()
    return usable


async def _attach_sub_question_audio(
    provider: XkwProvider, version_ids: list[uuid.UUID], ctx: CallContext
) -> None:
    """One /xopqbm/medias call for the chosen questions that carry audio and
    have sub-questions (listening); inline stem audio needs nothing."""
    async with AsyncSessionLocal() as db:
        targets = await question_bank_service.audio_targets(db, version_ids=version_ids)
    if not targets:
        return
    try:
        entries = await provider.medias(list(targets)[:30], ctx=ctx)
    except XkwError as exc:
        logger.warning("medias fetch failed (%s); sub-question audio skipped", exc.code)
        return
    async with AsyncSessionLocal() as db:
        await question_bank_service.apply_medias(db, entries=entries)


async def run_build(set_id: uuid.UUID) -> str:
    """Async body (the CLI --inline path awaits it directly). Returns the
    final set status."""
    provider: XkwProvider | None = None
    try:
        try:
            guarded = await _guard(set_id)
        except _Terminal as terminal:
            async with AsyncSessionLocal() as db:
                await question_set_service.mark_status(
                    db, set_id=set_id, status=terminal.status, error_type=terminal.error_type
                )
            return terminal.status
        if guarded is None:
            return "skipped"
        question_set, spec = guarded
        ctx = CallContext(
            use_case=_USE_CASE,
            trace_id=uuid.uuid4().hex,
            user_id=str(question_set.user_id),
            question_set_id=str(set_id),
        )
        provider = build_provider()
        session_id: str | None = None
        usable: list[uuid.UUID] = []
        calls = 0
        while calls < settings.qbank_max_calls_per_set and len(usable) < spec.count:
            try:
                page = await provider.fetch_questions(spec.to_query(session_id=session_id), ctx=ctx)
            except XkwError as exc:
                if usable:
                    logger.warning("set %s: stopping after partial fetch (%s)", set_id, exc.code)
                    break
                async with AsyncSessionLocal() as db:
                    await question_set_service.mark_status(
                        db, set_id=set_id, status=question_set_service.STATUS_FAILED, error_type=exc.code
                    )
                return question_set_service.STATUS_FAILED
            calls += 1
            session_id = page.session_id or session_id
            if not page.questions:
                break
            for version_id in await _store(
                page.questions, course_id=spec.xkw_course_id, provider_name=provider.name
            ):
                if version_id not in usable:
                    usable.append(version_id)

        chosen = usable[: spec.count]
        if len(chosen) < MIN_SET_SIZE:
            async with AsyncSessionLocal() as db:
                await question_set_service.mark_status(
                    db, set_id=set_id, status=question_set_service.STATUS_EMPTY, error_type="too_few_questions"
                )
            return question_set_service.STATUS_EMPTY
        if calls < settings.qbank_max_calls_per_set:
            await _attach_sub_question_audio(provider, chosen, ctx)
        async with AsyncSessionLocal() as db:
            await question_set_service.set_items(db, set_id=set_id, version_ids=chosen)
            await question_set_service.mark_status(db, set_id=set_id, status=question_set_service.STATUS_READY)
        return question_set_service.STATUS_READY
    finally:
        if provider is not None:
            await provider.aclose()
        await engine.dispose()


async def _give_up(set_id: uuid.UUID) -> None:
    try:
        async with AsyncSessionLocal() as db:
            await question_set_service.mark_status(
                db, set_id=set_id, status=question_set_service.STATUS_FAILED, error_type="build_crashed"
            )
    except Exception:  # noqa: BLE001 — last line of defence, log only
        logger.exception("failed to mark question set %s failed", set_id)
    finally:
        await engine.dispose()


@celery_app.task(name="qbank.build_set", bind=True, max_retries=_INFRA_MAX_RETRIES)
def build_question_set(self, set_id: str) -> str:  # noqa: ANN001 — celery bind
    """Sync entrypoint. Idempotent: set_items replaces, versions dedupe."""
    try:
        return asyncio.run(run_build(uuid.UUID(set_id)))
    except Exception as exc:  # noqa: BLE001 — infra error (DB/Redis/network)
        if self.request.retries >= _INFRA_MAX_RETRIES:
            logger.exception("question set %s build retries exhausted", set_id)
            asyncio.run(_give_up(uuid.UUID(set_id)))
            raise
        raise self.retry(exc=exc, countdown=_INFRA_RETRY_DELAY_S)
