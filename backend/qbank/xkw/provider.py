"""XkwProvider protocol + the real HTTP implementation.

services/ and tasks/ only ever talk to a provider; which one is picked by
QBANK_XKW_PROVIDER (fixture | http). The fixture provider serves the doc
samples offline so the whole pipeline runs without an account.
"""

from typing import Any, Protocol

from core.config import settings
from qbank.xkw.client import XkwClient
from qbank.xkw.types import (
    CallContext,
    QuestionQuery,
    SourceKind,
    XkwQuestionPage,
    XkwQuestionRaw,
    XkwResult,
)

PATH_QUESTIONS = "/xopqbm/questions"
PATH_KEYWORD_SEARCH = "/xopqbm/questions/keyword-search"
PATH_COURSES = "/xopqbm/courses/all"
PATH_QUESTION_TYPES = "/xopqbm/question-types"
PATH_KNOWLEDGE_TREE = "/xopqbm/courses/knowledge-points"
PATH_MEDIAS = "/xopqbm/medias"


class XkwProvider(Protocol):
    name: str

    async def fetch_questions(
        self, query: QuestionQuery, *, ctx: CallContext
    ) -> XkwQuestionPage: ...

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
    ) -> XkwQuestionPage: ...

    async def list_courses(self, *, ctx: CallContext) -> list[dict[str, Any]]: ...

    async def question_types(
        self, course_id: int, *, ctx: CallContext
    ) -> list[dict[str, Any]]: ...

    async def knowledge_tree(
        self, course_id: int, *, ctx: CallContext
    ) -> list[dict[str, Any]]: ...

    async def medias(
        self, question_ids: list[str], *, ctx: CallContext
    ) -> list[dict[str, Any]]: ...

    async def aclose(self) -> None: ...


def _page(result: XkwResult, source_kind: SourceKind = "premium") -> XkwQuestionPage:
    return XkwQuestionPage(
        questions=[
            XkwQuestionRaw.from_payload(item, source_kind=source_kind)
            for item in result.items
            if isinstance(item, dict) and item.get("id")
        ],
        session_id=result.session_id,
        billable=result.billable,
        total_page=result.total_page,
    )


class HttpXkwProvider:
    name = "http"

    def __init__(self, client: XkwClient) -> None:
        self._client = client

    async def fetch_questions(
        self, query: QuestionQuery, *, ctx: CallContext
    ) -> XkwQuestionPage:
        result = await self._client.request(
            "POST", PATH_QUESTIONS, ctx=ctx, body=query.to_body()
        )
        return _page(result)

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
        body = {
            "course_id": course_id,
            "keywords": keywords[:200],
            "page_index": page_index,
            "page_size": min(page_size, 10),
            "type_ids": type_ids or [],
            "difficulty_levels": (difficulty_levels or [])[:5],
            "formula_pic_format": "svg",
            "highlight": False,
        }
        result = await self._client.request(
            "POST", PATH_KEYWORD_SEARCH, ctx=ctx, body=body
        )
        return _page(result)

    async def list_courses(self, *, ctx: CallContext) -> list[dict[str, Any]]:
        result = await self._client.request("GET", PATH_COURSES, ctx=ctx)
        return [item for item in result.items if isinstance(item, dict)]

    async def question_types(
        self, course_id: int, *, ctx: CallContext
    ) -> list[dict[str, Any]]:
        result = await self._client.request(
            "GET", PATH_QUESTION_TYPES, ctx=ctx, query={"course_id": course_id}
        )
        return [item for item in result.items if isinstance(item, dict)]

    async def knowledge_tree(
        self, course_id: int, *, ctx: CallContext
    ) -> list[dict[str, Any]]:
        result = await self._client.request(
            "GET", PATH_KNOWLEDGE_TREE, ctx=ctx, query={"course_id": course_id}
        )
        return [item for item in result.items if isinstance(item, dict)]

    async def medias(
        self, question_ids: list[str], *, ctx: CallContext
    ) -> list[dict[str, Any]]:
        result = await self._client.request(
            "POST",
            PATH_MEDIAS,
            ctx=ctx,
            body={"question_ids": question_ids[:30], "formula_pic_format": "svg"},
        )
        return [item for item in result.items if isinstance(item, dict)]

    async def aclose(self) -> None:
        await self._client.aclose()


def build_provider() -> XkwProvider:
    """A fresh provider for this caller (Celery: one per task)."""
    if settings.qbank_xkw_provider == "http":
        client = XkwClient(
            app_id=settings.xkw_app_id,
            secret=settings.xkw_secret,
            base_url=settings.xkw_base_url,
            sign_version=settings.xkw_sign_version,
            timeout_s=settings.xkw_timeout_seconds,
        )
        return HttpXkwProvider(client)
    from qbank.xkw.fixture_provider import FixtureXkwProvider

    return FixtureXkwProvider()
