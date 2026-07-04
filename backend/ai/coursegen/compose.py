"""选片 + 组织（搜索前置的核心 AI 步）：候选池 + 问卷答案 → ComposedCourseResult。

LLM 只做"在真实候选中挑选并组织成 units/chapters"，不得臆造候选（prompt 已写死，
且课程规模由供给质量决定、宁少勿凑）。ranking 复用于预排序 + 裁剪 top-K，控制喂给
LLM 的规模与 token。返回前做**零信任校验**：每个 candidate_ref 必须命中真实候选、
去重、剔除非法，保证每个章节都绑定一个真实候选；无有效章节则返回 None（上层标 failed）。
"""

import logging
from collections.abc import AsyncIterator

from ai.client import ai_client
from ai.coursegen.ranking import rank
from ai.coursegen.types import (
    ComposedCourse,
    ComposedCourseResult,
    ResolvedChapter,
    ResolvedUnit,
)
from ai.errors import AIError
from ai.search import VideoCandidate
from ai.types import AIUseCase, StructuredStreamEvent
from ai.video_limits import MAX_CANDIDATE_DURATION_S, fits_token_limit

logger = logging.getLogger("lemma.ai.coursegen")

# How many (ranked) candidates we present to the compose LLM. Caps the prompt
# size / token cost; the rest of the pool stays in the DB for future reuse.
_COMPOSE_TOP_K = 40
_DESC_MAX_CHARS = 120
_MAX_TAGS = 6


def candidate_ref(candidate: VideoCandidate) -> str:
    """Stable, identity-based ref shown to the LLM and validated against the pool.

    Not a positional index (那会"序号漂移"): it is platform + platform_video_id,
    so a fabricated/misremembered ref simply fails the membership check.
    """
    return f"{candidate.platform.value}:{candidate.platform_video_id}"


def _compose_prompt(
    topic: str, answers: dict[str, str] | None, ranked: list[VideoCandidate]
) -> str:
    listing = "\n".join(_format_candidate(candidate) for candidate in ranked)
    return (
        f"学习主题：{topic}\n"
        f"问卷画像：{_format_profile(answers)}\n\n"
        f"候选视频清单（每条以 ref=<标识> 开头，绑定章节时 candidate_ref 必须用该 ref）：\n"
        f"{listing}"
    )


def _validate_composed(
    composed: ComposedCourse | None,
    by_ref: dict[str, VideoCandidate],
    *,
    topic: str,
) -> ComposedCourseResult | None:
    """零信任校验 on the FINAL compose output -> ComposedCourseResult, or None
    when nothing valid survives (caller marks the course failed)."""
    units = _resolve_units(composed, by_ref) if composed is not None else []
    if not units:
        logger.warning("compose produced no valid chapter for topic %r", topic)
        return None
    title = (composed.title or "").strip() or topic if composed else topic
    return ComposedCourseResult(title=title, units=units)


async def stream_compose_course(
    topic: str,
    answers: dict[str, str] | None,
    candidates: list[VideoCandidate],
) -> AsyncIterator[StructuredStreamEvent[ComposedCourseResult]]:
    """Streamed select + organize: forward the model's reasoning live as it
    selects+organizes, then yield exactly one terminal event:

    - result(ComposedCourseResult) — validated course (every chapter a real
      candidate); result is None when the pool is empty or nothing survives the
      zero-trust validation (-> caller marks the course failed);
    - error(code, message) — the compose model call failed.

    The candidate_ref validation (零信任 LLM) is unchanged — it runs on the
    FINAL ComposedCourse, exactly as the non-streaming path did.
    """
    if not candidates:
        yield StructuredStreamEvent(kind="result", result=None)
        return
    # 400 preflight (7-3 工单): videos longer than the provider's hard token cap
    # fail EVERY overview/companion call deterministically, so they must never
    # be selectable. Unknown durations pass (resolution downgrade + the provider
    # error is the fallback for those).
    usable = [c for c in candidates if fits_token_limit(c.duration_s)]
    dropped = len(candidates) - len(usable)
    if dropped:
        logger.warning(
            "compose dropped %d candidate(s) over the %ds provider token cap for"
            " topic %r",
            dropped,
            MAX_CANDIDATE_DURATION_S,
            topic,
        )
    if not usable:
        yield StructuredStreamEvent(kind="result", result=None)
        return
    ranked = rank(usable)[:_COMPOSE_TOP_K]
    by_ref = {candidate_ref(candidate): candidate for candidate in ranked}
    prompt = _compose_prompt(topic, answers, ranked)
    async for event in ai_client.stream_generate(
        AIUseCase.COURSE_COMPOSE, prompt, ComposedCourse
    ):
        if event.kind == "reasoning":
            yield StructuredStreamEvent(
                kind="reasoning", reasoning_text=event.reasoning_text
            )
            continue
        if event.kind == "error":
            yield StructuredStreamEvent(
                kind="error",
                error_code=event.error_code,
                error_message=event.error_message,
            )
            return
        # event.kind == "result": validate the final structured output.
        yield StructuredStreamEvent(
            kind="result",
            result=_validate_composed(event.result, by_ref, topic=topic),
        )
        return


async def compose_course(
    topic: str,
    answers: dict[str, str] | None,
    candidates: list[VideoCandidate],
) -> ComposedCourseResult | None:
    """Non-streaming convenience over stream_compose_course (drains it).

    Kept for callers/smokes that only need the validated result. None when the
    pool is empty or nothing valid survives; raises AIError on a model failure
    (same contract as before the streaming refactor)."""
    async for event in stream_compose_course(topic, answers, candidates):
        if event.kind == "error":
            raise AIError(event.error_message or "course compose failed")
        if event.kind == "result":
            return event.result
    return None


def _resolve_units(
    composed: ComposedCourse, by_ref: dict[str, VideoCandidate]
) -> list[ResolvedUnit]:
    """Validate the LLM output against the real pool (零信任 LLM).

    Drops chapters whose candidate_ref is fabricated/out-of-range or duplicates an
    already-used candidate; drops units left empty. Every surviving chapter is
    bound to a real VideoCandidate.
    """
    used: set[str] = set()
    resolved_units: list[ResolvedUnit] = []
    for unit in composed.units:
        chapters: list[ResolvedChapter] = []
        for chapter in unit.chapters:
            ref = (chapter.candidate_ref or "").strip()
            candidate = by_ref.get(ref)
            if candidate is None:
                logger.warning("compose dropped chapter with invalid ref %r", ref)
                continue
            if ref in used:
                logger.warning("compose dropped duplicate ref %r", ref)
                continue
            used.add(ref)
            title = (chapter.title or "").strip() or candidate.title
            chapters.append(ResolvedChapter(title=title, candidate=candidate))
        if chapters:
            resolved_units.append(
                ResolvedUnit(title=(unit.title or "").strip() or "未命名单元", chapters=chapters)
            )
    return resolved_units


def _format_profile(answers: dict[str, str] | None) -> str:
    if not answers:
        return "（无）"
    return "；".join(f"{key}:{value}" for key, value in answers.items())


def _format_candidate(candidate: VideoCandidate) -> str:
    if candidate.duration_s is not None:
        minutes, seconds = divmod(candidate.duration_s, 60)
        duration = f"{minutes}分{seconds}秒"
    else:
        duration = "未知时长"
    parts = [
        f"ref={candidate_ref(candidate)}",
        f"[{candidate.platform.value}]",
        candidate.title,
        f"作者:{candidate.author or '未知'}",
        f"时长:{duration}",
        f"播放:{candidate.view_count if candidate.view_count is not None else '未知'}",
        f"点赞:{candidate.like_count if candidate.like_count is not None else '未知'}",
        f"评论:{candidate.comment_count if candidate.comment_count is not None else '未知'}",
    ]
    if candidate.tags:
        parts.append(f"标签:{'，'.join(candidate.tags[:_MAX_TAGS])}")
    if candidate.metrics:
        parts.append(
            "其他:" + "，".join(f"{k}:{v}" for k, v in candidate.metrics.items())
        )
    description = (candidate.description or "").strip().replace("\n", " ")
    if description:
        if len(description) > _DESC_MAX_CHARS:
            description = description[:_DESC_MAX_CHARS] + "…"
        parts.append(f"简介:{description}")
    return " | ".join(parts)
