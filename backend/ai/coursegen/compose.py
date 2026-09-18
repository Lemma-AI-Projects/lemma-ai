"""选片 + 组织（搜索前置的核心 AI 步）：候选池 + 问卷答案 → ComposedCourseResult。

LLM 只做"在真实候选中挑选并组织成 module → lesson → point"，不得臆造候选（prompt
已写死，且课程规模由供给质量决定、宁少勿凑）。ranking 复用于预排序 + 裁剪 top-K，
控制喂给 LLM 的规模与 token。返回前做**零信任校验**：每个 candidate_ref 必须命中
真实候选、去重、剔除非法，空 lesson / 空 module 自底向上剪掉，并对学习点总数封顶
（每个学习点 = 一次视频下载，四层结构天然诱使模型多产叶子）。无有效学习点则返回
None（上层标 failed）。
"""

import logging
from collections.abc import AsyncIterator

from ai.client import ai_client
from ai.coursegen.ranking import rank
from ai.coursegen.types import (
    ComposedCourse,
    ComposedCourseResult,
    ResolvedLesson,
    ResolvedModule,
    ResolvedPoint,
)
from ai.errors import AIError
from ai.search import VideoCandidate
from ai.types import AIUseCase, StructuredStreamEvent
from ai.video_limits import MAX_CANDIDATE_DURATION_S, fits_token_limit

logger = logging.getLogger("lemma.ai.coursegen")

# How many (ranked) candidates we present to the compose LLM. Caps the prompt
# size / token cost; the rest of the pool stays in the DB for future reuse.
_COMPOSE_TOP_K = 40
# Hard ceiling on learning points per course. Every point costs one video
# download + one Storage object + one materialize task, and the per-level caps
# in the prompt multiply out to far more than the candidate pool can honestly
# fill — so the structure is truncated here rather than padded by the model.
_MAX_POINTS = 20
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
        f"候选视频清单（每条以 ref=<标识> 开头，绑定学习点时 candidate_ref 必须用该 ref）：\n"
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
    modules = _resolve_modules(composed, by_ref) if composed is not None else []
    if not modules:
        logger.warning("compose produced no valid learning point for topic %r", topic)
        return None
    title = (composed.title or "").strip() or topic if composed else topic
    description = (composed.description or "").strip() if composed else ""
    return ComposedCourseResult(
        title=title, description=description, modules=modules
    )


async def stream_compose_course(
    topic: str,
    answers: dict[str, str] | None,
    candidates: list[VideoCandidate],
) -> AsyncIterator[StructuredStreamEvent[ComposedCourseResult]]:
    """Streamed select + organize: forward the model's reasoning live as it
    selects+organizes, then yield exactly one terminal event:

    - result(ComposedCourseResult) — validated course (every point a real
      candidate); result is None when the pool is empty or nothing survives the
      zero-trust validation (-> caller marks the course failed);
    - error(code, message) — the compose model call failed.
    """
    if not candidates:
        yield StructuredStreamEvent(kind="result", result=None)
        return
    # 400 preflight (7-3 工单): videos longer than the provider's hard token cap
    # fail EVERY companion call deterministically, so they must never be
    # selectable. Unknown durations pass (resolution downgrade + the provider
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
    pool is empty or nothing valid survives; raises AIError on a model failure.
    """
    async for event in stream_compose_course(topic, answers, candidates):
        if event.kind == "error":
            raise AIError(event.error_message or "course compose failed")
        if event.kind == "result":
            return event.result
    return None


def _resolve_modules(
    composed: ComposedCourse, by_ref: dict[str, VideoCandidate]
) -> list[ResolvedModule]:
    """Validate the LLM output against the real pool (零信任 LLM), bottom-up.

    Drops points whose candidate_ref is fabricated/out-of-range or duplicates an
    already-used candidate; drops lessons and then modules left empty; stops
    accepting points once _MAX_POINTS is reached. Every surviving point is bound
    to a real VideoCandidate.
    """
    used: set[str] = set()
    resolved_modules: list[ResolvedModule] = []
    for module in composed.modules:
        lessons: list[ResolvedLesson] = []
        for lesson in module.lessons:
            points: list[ResolvedPoint] = []
            for point in lesson.points:
                if len(used) >= _MAX_POINTS:
                    logger.warning(
                        "compose truncated the course at %d learning points",
                        _MAX_POINTS,
                    )
                    break
                ref = (point.candidate_ref or "").strip()
                candidate = by_ref.get(ref)
                if candidate is None:
                    logger.warning("compose dropped point with invalid ref %r", ref)
                    continue
                if ref in used:
                    logger.warning("compose dropped duplicate ref %r", ref)
                    continue
                used.add(ref)
                title = (point.title or "").strip() or candidate.title
                points.append(ResolvedPoint(title=title, candidate=candidate))
            if points:
                lessons.append(
                    ResolvedLesson(
                        title=(lesson.title or "").strip() or "未命名单元",
                        summary=(lesson.summary or "").strip(),
                        points=points,
                    )
                )
        if lessons:
            resolved_modules.append(
                ResolvedModule(
                    title=(module.title or "").strip() or "未命名章",
                    summary=(module.summary or "").strip(),
                    lessons=lessons,
                )
            )
    return resolved_modules


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
