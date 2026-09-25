"""XKW question HTML -> Lemma application contract (QuestionView / Review).

Pipeline: clean -> collect structure -> plan slots -> align answers ->
rewrite anchors (`data-slot-id` / `data-og-id` / `data-sq-id`) -> serialize.
Anything the markup can't support degrades explicitly: `structure: raw` for
massive-edition / unparseable questions, `unsupported` slots, `missing`
references. A parse never raises; failures come back as raw.

PARSER_VERSION is part of every contentVersion: bump it whenever a rule here
changes the output, so stale submissions are rejected (409).
"""

import hashlib
import logging
from typing import Any

from qbank.parser.align import SlotOutcome, align
from qbank.parser.answer import parse_answer
from qbank.parser.clean import clean_tree
from qbank.parser.explanation import SegNode, parse_explanation
from qbank.parser.html import (
    find_answer_container,
    find_first_class,
    inner_html,
    make_anchor,
    outer_html,
    parse_fragment,
    replace_with,
)
from qbank.parser.slots import OgPlan, QuestionPlan, plan_question
from qbank.parser.stem import collect
from qbank.types import ParsedQuestion
from qbank.xkw.types import XkwQuestionRaw

logger = logging.getLogger("lemma.qbank.parser")

PARSER_VERSION = 1

__all__ = ["PARSER_VERSION", "compute_content_version", "parse_question"]


def compute_content_version(stem: str, answer: str, explanation: str) -> str:
    digest = hashlib.sha256(f"{stem}{answer}{explanation}".encode("utf-8")).hexdigest()
    return f"{PARSER_VERSION}.{digest[:12]}"


def parse_question(raw: XkwQuestionRaw, *, question_key: str) -> ParsedQuestion:
    content_version = compute_content_version(raw.stem, raw.answer, raw.explanation)
    if raw.source_kind == "massive":
        return _raw(raw, question_key, content_version, parse_status="raw")
    try:
        return _parse(raw, question_key, content_version)
    except _NoStem:
        return _raw(raw, question_key, content_version, parse_status="raw")
    except Exception:  # noqa: BLE001 — never let one bad question kill a build
        logger.exception("question %s failed to parse; degraded to raw", raw.id)
        return _raw(raw, question_key, content_version, parse_status="failed")


class _NoStem(Exception):
    pass


def _meta(raw: XkwQuestionRaw) -> dict[str, Any]:
    level = raw.difficulty_level if raw.difficulty_level in (17, 18, 19, 20, 21) else None
    return {
        "source": {"provider": "xkw", "externalId": raw.id, "sourceKind": raw.source_kind},
        "typeId": raw.type_id,
        "typeName": raw.type_name,
        "difficulty": raw.difficulty,
        "difficultyLevel": level,
        "knowledgePoints": [
            {"id": str(item.get("id")), "name": str(item.get("name") or "")}
            for item in raw.kpoints
            if isinstance(item, dict) and item.get("id") is not None
        ],
        "years": [int(year) for year in raw.years if isinstance(year, int)],
        "sourcePapers": [
            str(paper.get("title"))
            for paper in raw.source_papers
            if isinstance(paper, dict) and paper.get("title")
        ],
        "courseName": raw.course_name,
    }


def _cleaned_outer(markup: str, class_name: str) -> str | None:
    if not markup:
        return None
    root = parse_fragment(markup)
    clean_tree(root)
    el = (
        find_answer_container(root)
        if class_name == "qml-answer"
        else find_first_class(root, class_name)
    )
    return outer_html(el) if el is not None else (inner_html(root).strip() or None)


def _raw(
    raw: XkwQuestionRaw, key: str, content_version: str, *, parse_status: str
) -> ParsedQuestion:
    """Read-only question. The answer and explanation go ONLY into the review
    (never into the view), so nothing is visible before a submission."""
    stem_html = _cleaned_outer(raw.stem, "qml-stem") or ""
    answer_html = _cleaned_outer(raw.answer, "qml-answer")
    explanation_html = _cleaned_outer(raw.explanation, "qml-explanation")
    view = {
        "id": key,
        "contentVersion": content_version,
        "structure": "raw",
        "numbering": "none",
        "stem": {"html": ""},
        "slots": [],
        "optionGroups": [],
        "subQuestions": [],
        "media": [],
        "meta": _meta(raw),
        "raw": {"stem": {"html": stem_html}, "answer": None, "explanation": None},
    }
    review = {
        "questionId": key,
        "contentVersion": content_version,
        "referenceAnswers": [],
        "answerFallback": {"html": answer_html} if answer_html else None,
        "explanation": (
            [{"name": "解析", "content": {"html": explanation_html}, "scope": {"kind": "question"}}]
            if explanation_html
            else []
        ),
        "media": [],
    }
    return ParsedQuestion(
        parser_version=PARSER_VERSION,
        content_version=content_version,
        structure="raw",
        parse_status=parse_status,  # type: ignore[arg-type]
        view=view,
        review=review,
        slot_map={"slots": {}, "optionGroups": {}},
        degraded_slot_count=0,
    )


def _parse(raw: XkwQuestionRaw, key: str, content_version: str) -> ParsedQuestion:
    stem_root = parse_fragment(raw.stem)
    clean_tree(stem_root)
    stem_el = find_first_class(stem_root, "qml-stem")
    if stem_el is None:
        raise _NoStem()
    top = collect(stem_el)
    plan = plan_question(top, key=key, type_name=raw.type_name)

    answer_root = parse_fragment(raw.answer)
    clean_tree(answer_root)
    answer = parse_answer(answer_root)

    explanation_root = parse_fragment(raw.explanation)
    clean_tree(explanation_root)
    segments = parse_explanation(explanation_root)

    aligned = align(plan, answer, type_name=raw.type_name)

    # --- rewrite anchors (after every structural read is done) ---
    for outcome in [*aligned.top, *(o for sub in aligned.subs for o in sub)]:
        blank = outcome.plan.blank
        if blank is not None:
            replace_with(blank.el, make_anchor("data-slot-id", outcome.plan.id, class_name="qml-bk"))
    for container in [plan.top, *plan.subs]:
        for og in container.ogs:
            replace_with(og.node.el, make_anchor("data-og-id", og.id))

    sub_views = []
    numbering = "none"
    if top.sqs:
        numbering = "per-question" if any(sq.per_question for sq in top.sqs) else "sequential"
    for index, (sq, sub_plan, outcomes) in enumerate(
        zip(top.sqs, plan.subs, aligned.subs), start=1
    ):
        sub_stem = inner_html(sq.stem_el).strip() if sq.stem_el is not sq.el else ""
        label = sq.label_text or (f"（{index}）" if numbering == "per-question" else f"{index}.")
        sub_views.append(
            {
                "id": f"{key}:sq{index}",
                "label": label,
                "stem": {"html": sub_stem} if sub_stem else None,
                "slots": [_slot_view(outcome) for outcome in outcomes],
                "optionGroups": [_og_view(og) for og in sub_plan.ogs],
                "media": [],
            }
        )
        replace_with(sq.el, make_anchor("data-sq-id", f"{key}:sq{index}"))

    view = {
        "id": key,
        "contentVersion": content_version,
        "structure": "parsed",
        "numbering": numbering,
        "stem": {"html": inner_html(stem_el).strip()},
        "slots": [_slot_view(outcome) for outcome in aligned.top],
        "optionGroups": [_og_view(og) for og in plan.top.ogs],
        "subQuestions": sub_views,
        "media": [],
        "meta": _meta(raw),
        "raw": None,
    }
    all_outcomes = [*aligned.top, *(o for sub in aligned.subs for o in sub)]
    review = {
        "questionId": key,
        "contentVersion": content_version,
        "referenceAnswers": [
            {"slotId": outcome.plan.id, "answer": outcome.reference} for outcome in all_outcomes
        ],
        "answerFallback": {"html": aligned.answer_fallback} if aligned.answer_fallback else None,
        "explanation": _explanation(segments, plan, key),
        "media": [],
    }
    slot_map = {
        "slots": {
            outcome.plan.id: {
                "mechanism": outcome.mechanism,
                "grading": outcome.grading,
                "optionGroupId": outcome.plan.og.id if outcome.plan.og else None,
                "reference": outcome.reference,
            }
            for outcome in all_outcomes
        },
        "optionGroups": {
            og.id: {
                "optionIds": [f"{og.id}:{option.label}" for option in (og.node.options or [])],
                "reuse": og.reuse,
            }
            for container in [plan.top, *plan.subs]
            for og in container.ogs
        },
    }
    degraded = sum(
        1
        for outcome in all_outcomes
        if outcome.mechanism == "unsupported" or outcome.grading == "unknown"
    )
    return ParsedQuestion(
        parser_version=PARSER_VERSION,
        content_version=content_version,
        structure="parsed",
        parse_status="parsed",
        view=view,
        review=review,
        slot_map=slot_map,
        degraded_slot_count=degraded,
    )


def _slot_view(outcome: SlotOutcome) -> dict[str, Any]:
    blank = outcome.plan.blank
    return {
        "id": outcome.plan.id,
        "mechanism": outcome.mechanism,
        "grading": outcome.grading,
        "optionGroupId": outcome.plan.og.id if outcome.plan.og else None,
        "select": outcome.select,
        "blank": (
            {
                "style": blank.style,
                "size": blank.size,
                "inlineLabel": str(blank.index) if blank.sq and blank.index is not None else None,
            }
            if blank is not None
            else None
        ),
        "anchored": outcome.plan.anchored,
    }


def _og_view(og: OgPlan) -> dict[str, Any]:
    return {
        "id": og.id,
        "options": [
            {"id": f"{og.id}:{option.label}", "label": option.label, "content": {"html": option.html}}
            for option in (og.node.options or [])
        ],
        "cols": og.node.cols,
        "layout": og.node.layout,
        "reuse": og.reuse,
        "anchored": True,
    }


def _explanation(
    segments: list[SegNode], plan: QuestionPlan, key: str
) -> list[dict[str, Any]]:
    sq_segments = [segment for segment in segments if segment.kind == "sq"]
    scopes: dict[int, dict[str, Any]] = {}
    if plan.subs and len(sq_segments) == len(plan.subs):
        scopes = {
            id(segment): {"kind": "sub-question", "subQuestionId": f"{key}:sq{index}"}
            for index, segment in enumerate(sq_segments, start=1)
        }
    elif not plan.subs and sq_segments and len(sq_segments) == len(plan.top.slots):
        scopes = {
            id(segment): {"kind": "slot", "slotId": slot.id}
            for segment, slot in zip(sq_segments, plan.top.slots)
        }
    out = []
    for segment in segments:
        if segment.kind == "seg":
            scope: dict[str, Any] = {"kind": "question"}
        else:
            scope = scopes.get(id(segment), {"kind": "unknown"})
        out.append({"name": segment.name, "content": {"html": segment.html}, "scope": scope})
    return out
