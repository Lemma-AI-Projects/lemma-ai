"""诉求级广搜（搜索前置）：用户诉求 → 扩词(宽) → YT+B站 检索 → 去重 → 候选池。

与问卷并发执行，所以扩词只依据用户诉求（此时还没有问卷答案），故意放宽以保证供给；
对学习者的收窄留到 compose 阶段（那时才有答案）。LLM 只用于扩词，搜索/去重确定性。
对运营性失败容错：单腿失败仅记录并跳过，最终返回去重后的全部候选；排序与选片都在
compose 阶段做（本步不排序、不裁剪）。course_id 仅用于把搜索花费记到 provider_usage_logs。
"""

import asyncio
import logging
import uuid
from collections.abc import Iterable

from ai.client import ai_client
from ai.coursegen.types import ChapterQueries
from ai.errors import AIError
from ai.search import (
    ApifyClient,
    SearchPlatform,
    VideoCandidate,
    VideoSearchQuery,
    search_videos,
)
from ai.types import AIUseCase

logger = logging.getLogger("lemma.ai.coursegen")

# provider_usage_logs.use_case for the request-level broad search.
_SEARCH_USE_CASE = "course_topic_search"
_SEARCH_PLATFORMS = (SearchPlatform.YOUTUBE, SearchPlatform.BILIBILI)
# Broader than the old per-chapter search: more queries, more per-query results,
# because this single pass must cover the whole topic's real supply.
_MAX_SEARCH_QUERIES = 4
_PER_QUERY_LIMIT = 8


async def search_topic(
    topic: str,
    *,
    course_id: uuid.UUID | None = None,
    client: ApifyClient | None = None,
) -> list[VideoCandidate]:
    """Broad-search the whole topic and return the deduped candidate pool.

    `client` lets the Celery task reuse one Apify client across legs (only built
    when a route uses Apify); self-built providers ignore it. Never raises on an
    operational search failure — a failed leg is logged and skipped.
    """
    queries = await _expand_queries(topic)
    return await _search_all(queries, course_id=course_id, client=client)


async def _expand_queries(topic: str) -> list[str]:
    prompt = f"学习诉求：{topic}"
    try:
        result = await ai_client.generate(
            AIUseCase.TOPIC_SEARCH, prompt, ChapterQueries
        )
        queries = _dedup_str(q.strip() for q in result.queries if q and q.strip())
    except AIError as exc:
        logger.warning("topic query expansion failed for %r: %s", topic, exc)
        queries = []
    # Always have at least the raw topic to search on.
    return queries or [topic]


async def _search_all(
    queries: list[str],
    *,
    course_id: uuid.UUID | None,
    client: ApifyClient | None,
) -> list[VideoCandidate]:
    search_queries = queries[:_MAX_SEARCH_QUERIES]
    legs = [
        search_videos(
            VideoSearchQuery(keyword=query),
            platform=platform,
            limit=_PER_QUERY_LIMIT,
            use_case=_SEARCH_USE_CASE,
            course_id=course_id,
            client=client,
        )
        for platform in _SEARCH_PLATFORMS
        for query in search_queries
    ]
    results = await asyncio.gather(*legs, return_exceptions=True)
    candidates: list[VideoCandidate] = []
    for result in results:
        if isinstance(result, AIError):
            logger.warning("topic search leg failed: %s", result)
            continue
        if isinstance(result, BaseException):
            raise result  # unexpected (non-AI) error: a real bug, surface it
        candidates.extend(result)
    return _dedup_candidates(candidates)


def _dedup_str(items: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        key = item.lower()
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out


def _dedup_candidates(candidates: list[VideoCandidate]) -> list[VideoCandidate]:
    seen: set[tuple[str, str]] = set()
    out: list[VideoCandidate] = []
    for candidate in candidates:
        key = (candidate.platform.value, candidate.platform_video_id)
        if key not in seen:
            seen.add(key)
            out.append(candidate)
    return out
