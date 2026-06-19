"""选片 + 组织（搜索前置的核心 AI 步）：候选池 + 问卷答案 → ComposedCourseResult。

LLM 只做"在真实候选中挑选并组织成 units/chapters"，不得臆造候选（prompt 已写死，
且课程规模由供给质量决定、宁少勿凑）。ranking 复用于预排序 + 裁剪 top-K，控制喂给
LLM 的规模与 token。返回前做**零信任校验**：每个 candidate_ref 必须命中真实候选、
去重、剔除非法，保证每个章节都绑定一个真实候选；无有效章节则返回 None（上层标 failed）。
"""

import logging

from ai.client import ai_client
from ai.coursegen.ranking import rank
from ai.coursegen.types import (
    ComposedCourse,
    ComposedCourseResult,
    ResolvedChapter,
    ResolvedUnit,
)
from ai.search import VideoCandidate
from ai.types import AIUseCase

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


async def compose_course(
    topic: str,
    answers: dict[str, str] | None,
    candidates: list[VideoCandidate],
) -> ComposedCourseResult | None:
    """Select + organize real candidates into a validated course. None when the
    pool is empty or nothing valid survives validation (-> caller marks failed)."""
    if not candidates:
        return None
    ranked = rank(candidates)[:_COMPOSE_TOP_K]
    by_ref = {candidate_ref(candidate): candidate for candidate in ranked}
    listing = "\n".join(_format_candidate(candidate) for candidate in ranked)
    prompt = (
        f"学习主题：{topic}\n"
        f"问卷画像：{_format_profile(answers)}\n\n"
        f"候选视频清单（每条以 ref=<标识> 开头，绑定章节时 candidate_ref 必须用该 ref）：\n"
        f"{listing}"
    )
    composed = await ai_client.generate(
        AIUseCase.COURSE_COMPOSE, prompt, ComposedCourse
    )
    units = _resolve_units(composed, by_ref)
    if not units:
        logger.warning("compose produced no valid chapter for topic %r", topic)
        return None
    title = (composed.title or "").strip() or topic
    return ComposedCourseResult(title=title, units=units)


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
