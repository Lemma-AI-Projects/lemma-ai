"""Offline XKW provider: serves the 02-试题HTML渲染说明 doc samples.

Lets the whole pipeline (build -> parse -> set -> attempt -> grade) run with
no account and no cost. Samples come from backend/tests/qbank/fixtures
(exported from the frontend fixtures); each is split into the three fields XKW
returns separately. Filters honoured: course_id (0 = every fixture course) and
session_id de-duplication; knowledge points / types are accepted but ignored.
Every call is still written to the ledger (billable=False).
"""

import json
import uuid
from pathlib import Path
from typing import Any

from qbank.parser.html import split_ques_html
from qbank.usage import UsageRecord, record_call
from qbank.xkw.client import Recorder
from qbank.xkw.provider import (
    PATH_COURSES,
    PATH_KEYWORD_SEARCH,
    PATH_KNOWLEDGE_TREE,
    PATH_MEDIAS,
    PATH_QUESTION_TYPES,
    PATH_QUESTIONS,
)
from qbank.xkw.types import CallContext, QuestionQuery, XkwQuestionPage, XkwQuestionRaw

DEFAULT_FIXTURE_DIR = Path(__file__).resolve().parents[2] / "tests" / "qbank" / "fixtures"

# Synthetic course dictionary for the fixture samples (学段×学科, like XKW).
FIXTURE_COURSES: list[dict[str, Any]] = [
    {"id": 101, "name": "小学语文", "stage_id": 2, "subject_id": 1},
    {"id": 201, "name": "初中语文", "stage_id": 3, "subject_id": 1},
    {"id": 202, "name": "初中英语", "stage_id": 3, "subject_id": 3},
    {"id": 203, "name": "初中化学", "stage_id": 3, "subject_id": 6},
    {"id": 204, "name": "初中生物", "stage_id": 3, "subject_id": 7},
    {"id": 301, "name": "高中语文", "stage_id": 4, "subject_id": 1},
    {"id": 302, "name": "高中英语", "stage_id": 4, "subject_id": 3},
    {"id": 303, "name": "高中数学", "stage_id": 4, "subject_id": 2},
]
_OBJECTIVE_TYPES = {"单选题", "听力选择题", "阅读理解", "完形填空", "判断题", "七选五", "语法填空"}

# session_id -> external ids already served (the real API keeps 24h).
_SERVED: dict[str, set[str]] = {}


def _type_id(name: str) -> str:
    return f"fx-{name}"


class FixtureXkwProvider:
    name = "fixture"

    def __init__(
        self, fixture_dir: Path | None = None, *, recorder: Recorder | None = record_call
    ) -> None:
        self._dir = fixture_dir or DEFAULT_FIXTURE_DIR
        self._recorder = recorder
        self._questions = self._load()

    def _load(self) -> list[XkwQuestionRaw]:
        course_by_name = {course["name"]: course["id"] for course in FIXTURE_COURSES}
        questions: list[XkwQuestionRaw] = []
        for path in sorted((self._dir / "expected").glob("*.json")):
            expected = json.loads(path.read_text("utf-8"))
            raw_file = expected.get("rawFile")
            if not raw_file:
                continue
            meta = expected["view"]["meta"]
            parts = split_ques_html((self._dir / "raw" / raw_file).read_text("utf-8"))
            type_name = meta.get("typeName")
            questions.append(
                XkwQuestionRaw(
                    id=meta["source"]["externalId"],
                    stem=parts["stem"],
                    answer=parts["answer"],
                    explanation=parts["explanation"],
                    course_id=course_by_name.get(meta.get("courseName")),
                    course_name=meta.get("courseName"),
                    type_id=_type_id(type_name) if type_name else None,
                    type_name=type_name,
                    answer_scoreable=bool(parts["answer"]),
                )
            )
        return questions

    async def _record(self, endpoint: str, ctx: CallContext, count: int, session_id: str | None = None) -> None:
        if self._recorder is None:
            return
        await self._recorder(
            UsageRecord(
                provider="fixture",
                endpoint=endpoint,
                use_case=ctx.use_case,
                trace_id=ctx.trace_id,
                success=True,
                billable=False,
                latency_ms=0,
                http_status=200,
                raw_code=2000000 if count else 900161214,
                result_count=count,
                session_id=session_id,
                user_id=ctx.user_id,
                question_set_id=ctx.question_set_id,
            )
        )

    def _pool(self, course_id: int) -> list[XkwQuestionRaw]:
        if course_id == 0:
            return list(self._questions)
        return [question for question in self._questions if question.course_id == course_id]

    async def fetch_questions(self, query: QuestionQuery, *, ctx: CallContext) -> XkwQuestionPage:
        session_id = query.session_id or uuid.uuid4().hex
        served = _SERVED.setdefault(session_id, set())
        picked = [q for q in self._pool(query.course_id) if q.id not in served][: query.count]
        served.update(question.id for question in picked)
        await self._record(PATH_QUESTIONS, ctx, len(picked), session_id)
        return XkwQuestionPage(
            questions=[question.model_copy(deep=True) for question in picked],
            session_id=session_id,
            billable=False,
        )

    async def keyword_search(
        self,
        *,
        course_id: int,
        keywords: str,
        ctx: CallContext,
        page_index: int = 1,
        page_size: int = 10,
        type_ids: list[str] | None = None,
        difficulty_levels: list[int] | None = None,
    ) -> XkwQuestionPage:
        needle = keywords.strip()
        hits = [q for q in self._pool(course_id) if needle and needle in q.stem]
        start = (page_index - 1) * page_size
        page = hits[start : start + page_size]
        await self._record(PATH_KEYWORD_SEARCH, ctx, len(page))
        return XkwQuestionPage(
            questions=[question.model_copy(deep=True) for question in page],
            billable=False,
            total_page=max(1, -(-len(hits) // page_size)),
        )

    async def list_courses(self, *, ctx: CallContext) -> list[dict[str, Any]]:
        await self._record(PATH_COURSES, ctx, len(FIXTURE_COURSES))
        return [dict(course) for course in FIXTURE_COURSES]

    async def question_types(self, course_id: int, *, ctx: CallContext) -> list[dict[str, Any]]:
        names = sorted({q.type_name for q in self._pool(course_id) if q.type_name})
        types = [
            {
                "id": _type_id(name),
                "name": name,
                "course_id": course_id,
                "parent_id": None,
                "objective": name in _OBJECTIVE_TYPES,
                "ordinal": index,
            }
            for index, name in enumerate(names)
        ]
        await self._record(PATH_QUESTION_TYPES, ctx, len(types))
        return types

    async def knowledge_tree(self, course_id: int, *, ctx: CallContext) -> list[dict[str, Any]]:
        tree = [
            {
                "id": course_id * 1000 + 1,
                "name": "综合",
                "parent_id": 0,
                "root_id": course_id * 1000 + 1,
                "depth": 1,
                "type": "NODE",
                "course_id": course_id,
                "ordinal": 0,
            }
        ]
        await self._record(PATH_KNOWLEDGE_TREE, ctx, len(tree))
        return tree

    async def medias(self, question_ids: list[str], *, ctx: CallContext) -> list[dict[str, Any]]:
        await self._record(PATH_MEDIAS, ctx, 0)
        return []

    async def aclose(self) -> None:
        return None
