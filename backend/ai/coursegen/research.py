"""单章研究流水线：扩词 → 搜索(YT+B站) → 去重 → 排序 → 选片。

LLM 判断只在两处（扩词、选片），其余确定性。整条流水线对运营性失败容错：
搜索/选片失败或无结果时返回 chosen=None + reason，绝不抛异常，让 Phase 5 能把
该章标 failed 而非整课崩。course_id 由调用方传入，仅用于把 Apify 搜索花费记到
provider_usage_logs（不自己造）。
"""

import asyncio
import logging
import uuid

from ai.client import ai_client
from ai.coursegen.ranking import rank
from ai.coursegen.types import (
    ChapterPlan,
    ChapterQueries,
    ChapterResearchResult,
    VideoSelection,
)
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

# provider_usage_logs.use_case for chapter video search — ties Apify spend to
# chapter research; course_id (threaded from the caller) attributes it further.
_SEARCH_USE_CASE = "chapter_video_search"

_SEARCH_PLATFORMS = (SearchPlatform.YOUTUBE, SearchPlatform.BILIBILI)
_MAX_SEARCH_QUERIES = 2  # distinct expanded queries actually searched
_PER_QUERY_LIMIT = 5  # candidates per (platform, query)
_SELECT_TOP_K = 8  # how many top-ranked candidates the LLM picks among


async def research_chapter(
    chapter_plan: ChapterPlan,
    profile: dict[str, str] | None = None,
    *,
    course_id: uuid.UUID | None = None,
    client: ApifyClient | None = None,
) -> ChapterResearchResult:
    # `client` lets the build task reuse ONE Apify client across all chapters
    # (Phase 5); None -> search_videos builds its own (standalone use).
    queries = await _expand_queries(chapter_plan, profile)
    candidates = await _search_all(queries, course_id=course_id, client=client)
    if not candidates:
        return ChapterResearchResult(
            candidates=[], chosen=None, reason="未找到任何候选视频"
        )
    ranked = rank(candidates, chapter_plan)
    try:
        chosen, reason = await _select(chapter_plan, profile, ranked)
    except AIError as exc:
        logger.warning("video selection failed for %r: %s", chapter_plan.title, exc)
        return ChapterResearchResult(
            candidates=ranked, chosen=None, reason=f"选片失败：{exc.message}"
        )
    return ChapterResearchResult(candidates=ranked, chosen=chosen, reason=reason)


async def _expand_queries(
    chapter_plan: ChapterPlan, profile: dict[str, str] | None
) -> list[str]:
    prompt = (
        f"章节标题：{chapter_plan.title}\n"
        f"章节摘要：{chapter_plan.summary}\n"
        f"学习者画像：{_format_profile(profile)}"
    )
    try:
        result = await ai_client.generate(
            AIUseCase.CHAPTER_QUERY, prompt, ChapterQueries
        )
        queries = _dedup_str(q.strip() for q in result.queries if q and q.strip())
    except AIError as exc:
        logger.warning("query expansion failed for %r: %s", chapter_plan.title, exc)
        queries = []
    # Always have at least the chapter title to search on.
    return queries or [chapter_plan.title]


async def _search_all(
    queries: list[str],
    *,
    course_id: uuid.UUID | None,
    client: ApifyClient | None,
) -> list[VideoCandidate]:
    search_queries = queries[:_MAX_SEARCH_QUERIES]
    tasks = [
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
    results = await asyncio.gather(*tasks, return_exceptions=True)
    candidates: list[VideoCandidate] = []
    for result in results:
        if isinstance(result, AIError):
            logger.warning("chapter search leg failed: %s", result)
            continue
        if isinstance(result, BaseException):
            raise result  # unexpected (non-AI) error: a real bug, surface it
        candidates.extend(result)
    return _dedup_candidates(candidates)


async def _select(
    chapter_plan: ChapterPlan,
    profile: dict[str, str] | None,
    ranked: list[VideoCandidate],
) -> tuple[VideoCandidate | None, str]:
    top = ranked[:_SELECT_TOP_K]
    listing = "\n".join(
        _format_candidate(index, candidate)
        for index, candidate in enumerate(top, start=1)
    )
    prompt = (
        f"章节标题：{chapter_plan.title}\n"
        f"章节摘要：{chapter_plan.summary}\n"
        f"学习者画像：{_format_profile(profile)}\n\n"
        f"候选视频：\n{listing}"
    )
    selection = await ai_client.generate(
        AIUseCase.VIDEO_SELECT, prompt, VideoSelection
    )
    index = selection.chosen_index
    if index is None or not (1 <= index <= len(top)):
        return None, selection.reason or "无合适候选视频"
    # Same object as ranked[index-1] -> the chosen entry inside `candidates`.
    return top[index - 1], selection.reason or "已选中"


def _format_profile(profile: dict[str, str] | None) -> str:
    if not profile:
        return "（无）"
    return "；".join(f"{key}:{value}" for key, value in profile.items())


def _format_candidate(index: int, candidate: VideoCandidate) -> str:
    if candidate.duration_s is not None:
        minutes, seconds = divmod(candidate.duration_s, 60)
        duration = f"{minutes}分{seconds}秒"
    else:
        duration = "未知时长"
    views = candidate.view_count if candidate.view_count is not None else "未知"
    return (
        f"{index}. [{candidate.platform.value}] {candidate.title} "
        f"| 作者:{candidate.author or '未知'} | 时长:{duration} | 播放:{views}"
    )


def _dedup_str(items) -> list[str]:
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
