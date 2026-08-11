"""Semantic board: LLM enrichment of rule-computed clusters (S3).

The rule layer (frontend `semantic/analyzer`) stays authoritative for layout.
This service only gives clusters human labels + a one-line intent description —
it NEVER produces coordinates. Degrades to None on any failure: the frontend
keeps its rule results untouched (transparent fallback).
"""

import logging

from ai import AIUseCase, ai_client
from core.config import settings
from schemas.board_semantic import BoardSemanticRequest, BoardSemanticResponse

logger = logging.getLogger("lemma.ai.board_semantic")


async def analyze_board_semantic(
    payload: BoardSemanticRequest, user_id: str
) -> BoardSemanticResponse | None:
    """LLM enrichment, gated by `board_semantic_enabled`. Returns None when
    disabled, on validation failure, or on any AI error — the caller treats
    None as "keep rule results"."""
    if not settings.board_semantic_enabled:
        return None

    shapes_text = "\n".join(
        f"- [{s.type}] {s.text}" + (f"（{s.mastery}）" if s.mastery else "")
        for s in payload.shapes
    )
    clusters_text = "\n".join(
        f"- 簇 {c.id}: {c.label}（成员: {', '.join(c.member_ids)}）"
        for c in payload.clusters
    )
    user_prompt = (
        "以下是知识画布上的形状文本与规则聚类结果。\n\n"
        f"【形状】\n{shapes_text}\n\n"
        f"【规则簇】\n{clusters_text}\n\n"
        "请为每个簇给出精炼的人类标签与一句话主题说明，并给出整体布局意图描述。"
    )

    try:
        return await ai_client.generate(
            AIUseCase.BOARD_SEMANTIC,
            user_prompt,
            BoardSemanticResponse,
            user_id=user_id,
        )
    except Exception:  # noqa: BLE001 — semantic enrichment must never break the board
        logger.exception(
            "board_semantic enrichment failed (user_id=%s) — falling back to rules",
            user_id,
        )
        return None
