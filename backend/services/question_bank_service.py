"""Question content persistence: the local copy of XKW questions and their
parsed versions (拉到即保存).

Owns the questions / question_versions ORM. Questions are global content
(no user filter here) and are only ever reachable through a set the caller
owns (question_set_service enforces that). Parsing is delegated to qbank.
"""

import hashlib
import json
import logging
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.question import Question, QuestionVersion
from qbank.parser import parse_question
from qbank.xkw.types import XkwQuestionRaw

logger = logging.getLogger("lemma.services.question_bank")

PROVIDER_XKW = "xkw"
# Doc samples served offline by the fixture provider: stored apart so they
# never mix with (or get counted as) real XKW content.
PROVIDER_XKW_FIXTURE = "xkw_fixture"


def storage_provider(provider_name: str) -> str:
    """questions.provider value for rows fetched through an XkwProvider."""
    return PROVIDER_XKW_FIXTURE if provider_name == "fixture" else PROVIDER_XKW


def question_key(question_id: uuid.UUID) -> str:
    """The question id the wire sees. Derived from the stable row id (not the
    version) so slot ids survive re-parses."""
    return f"q_{question_id.hex[:12]}"


def raw_hash(raw: XkwQuestionRaw) -> str:
    return hashlib.sha256(f"{raw.stem}{raw.answer}{raw.explanation}".encode("utf-8")).hexdigest()


def _meta_json(raw: XkwQuestionRaw) -> dict[str, Any]:
    return {
        "course_name": raw.course_name,
        "kpoints": raw.kpoints,
        "catalogs": raw.catalogs,
        "tags": raw.tags,
        "years": raw.years,
        "source_papers": raw.source_papers,
        "extra": raw.extra,
    }


def raw_from_row(question: Question) -> XkwQuestionRaw:
    meta = question.meta_json or {}
    return XkwQuestionRaw(
        id=question.external_id,
        stem=question.stem_html,
        answer=question.answer_html,
        explanation=question.explanation_html,
        source_kind=question.source_kind,  # type: ignore[arg-type]
        course_id=question.xkw_course_id,
        course_name=meta.get("course_name"),
        type_id=question.type_id,
        type_name=question.type_name,
        difficulty=float(question.difficulty) if question.difficulty is not None else None,
        difficulty_level=question.difficulty_level,
        answer_scoreable=question.answer_scoreable,
        media=question.media_flag,
        kpoints=meta.get("kpoints") or [],
        catalogs=meta.get("catalogs") or [],
        tags=meta.get("tags") or [],
        years=meta.get("years") or [],
        source_papers=meta.get("source_papers") or [],
        extra=meta.get("extra") or {},
    )


async def upsert_question(
    db: AsyncSession,
    raw: XkwQuestionRaw,
    *,
    objective: bool | None,
    provider: str = PROVIDER_XKW,
) -> Question:
    """Insert or refresh one fetched question. A changed raw hash means XKW
    corrected the content: the row is updated and a new version follows."""
    digest = raw_hash(raw)
    now = datetime.now(UTC)
    existing = (
        await db.execute(
            select(Question).where(Question.provider == provider, Question.external_id == raw.id)
        )
    ).scalar_one_or_none()
    fields = {
        "source_kind": raw.source_kind,
        "xkw_course_id": raw.course_id,
        "type_id": raw.type_id,
        "type_name": raw.type_name,
        "objective": objective,
        "difficulty": Decimal(str(raw.difficulty)) if raw.difficulty is not None else None,
        "difficulty_level": raw.difficulty_level,
        "answer_scoreable": raw.answer_scoreable,
        "media_flag": raw.media,
        "stem_html": raw.stem,
        "answer_html": raw.answer,
        "explanation_html": raw.explanation,
        "meta_json": _meta_json(raw),
        "raw_hash": digest,
        "fetched_at": now,
    }
    if existing is None:
        question = Question(provider=provider, external_id=raw.id, **fields)
        db.add(question)
        await db.flush()
        return question
    if existing.raw_hash != digest:
        logger.info("question %s content changed upstream; re-parsing", raw.id)
        for key, value in fields.items():
            setattr(existing, key, value)
    else:
        existing.fetched_at = now
        if objective is not None:
            existing.objective = objective
    await db.flush()
    return existing


async def ensure_current_version(db: AsyncSession, question: Question) -> QuestionVersion:
    """Parse the stored copy and return the version for today's parser.

    Existing versions are never rewritten: a new content_version adds a row
    and takes `is_current`; the old one stays for sets/attempts that pin it.
    """
    parsed = parse_question(raw_from_row(question), question_key=question_key(question.id))
    _merge_sub_question_media(parsed.view, (question.meta_json or {}).get("medias"))
    existing = (
        await db.execute(
            select(QuestionVersion).where(
                QuestionVersion.question_id == question.id,
                QuestionVersion.content_version == parsed.content_version,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        if not existing.is_current:
            await _make_current(db, question.id, existing.id)
        return existing
    version = QuestionVersion(
        question_id=question.id,
        parser_version=parsed.parser_version,
        content_version=parsed.content_version,
        structure=parsed.structure,
        view_json=parsed.view,
        review_json=parsed.review,
        slot_map_json=parsed.slot_map,
        parse_status=parsed.parse_status,
        degraded_slot_count=parsed.degraded_slot_count,
        fully_auto=parsed.fully_auto_gradable,
        is_current=False,
    )
    db.add(version)
    await db.flush()
    await _make_current(db, question.id, version.id)
    return version


async def _make_current(db: AsyncSession, question_id: uuid.UUID, version_id: uuid.UUID) -> None:
    await db.execute(
        update(QuestionVersion)
        .where(QuestionVersion.question_id == question_id)
        .values(is_current=QuestionVersion.id == version_id)
    )


async def audio_targets(db: AsyncSession, *, version_ids: list[uuid.UUID]) -> set[str]:
    """External ids of chosen questions with audio (media 1|3) and
    sub-questions, whose sub-question audio has not been fetched yet."""
    rows = await db.execute(
        select(Question.external_id, Question.meta_json, QuestionVersion.view_json)
        .join(QuestionVersion, QuestionVersion.question_id == Question.id)
        .where(QuestionVersion.id.in_(version_ids), Question.media_flag.in_((1, 3)))
    )
    return {
        external_id
        for external_id, meta, view in rows.all()
        if view.get("subQuestions") and "medias" not in (meta or {})
    }


async def apply_medias(db: AsyncSession, *, entries: list[dict[str, Any]]) -> None:
    """Store /xopqbm/medias results on their questions and merge sub-question
    audio into the current version's view (presentation only: it doesn't
    change contentVersion, and later re-parses merge it again from meta)."""
    by_external = {str(entry.get("question_id")): entry for entry in entries if entry.get("question_id")}
    if not by_external:
        return
    rows = await db.execute(
        select(Question, QuestionVersion)
        .join(QuestionVersion, QuestionVersion.question_id == Question.id)
        .where(Question.external_id.in_(list(by_external)), QuestionVersion.is_current.is_(True))
    )
    for question, version in rows.all():
        entry = by_external[question.external_id]
        question.meta_json = {**(question.meta_json or {}), "medias": entry}
        view = json.loads(json.dumps(version.view_json))
        _merge_sub_question_media(view, entry)
        version.view_json = view
    await db.commit()


def _merge_sub_question_media(view: dict[str, Any], medias: dict[str, Any] | None) -> None:
    """Sub-question audio from /xopqbm/medias -> SubQuestion.media.

    `sub_question_medias[].index` is documented as "小题的序号，从1开始" (09
    L154); whether it counts qml-sq or sub-question blanks is unverified, so
    it is applied only when it lands on an existing sub-question.
    """
    if not medias or view.get("structure") != "parsed":
        return
    subs = view.get("subQuestions") or []
    for entry in medias.get("sub_question_medias") or []:
        index = entry.get("index")
        if not isinstance(index, int) or not 1 <= index <= len(subs):
            continue
        for media in entry.get("stem_media") or []:
            if not media.get("src"):
                continue
            subs[index - 1]["media"].append(
                {
                    "kind": "audio",
                    "src": media["src"],
                    "title": media.get("title") or None,
                    "durationSeconds": media.get("duration"),
                    "poster": None,
                }
            )
