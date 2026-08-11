"""Semantic board endpoints (S3): LLM enrichment of rule-computed clusters.

Authentication via Lemma's Supabase JWT (existing pattern). The endpoint is
stateless: payload carries the trimmed shapes + rule clusters, response carries
labels + intent description. Returns 200 null when the feature is disabled or
enrichment fails — the frontend keeps its rule results (transparent fallback).
"""

from fastapi import APIRouter, Depends

from core.security import CurrentUser, get_current_user
from schemas.board_semantic import BoardSemanticRequest, BoardSemanticResponse
from services import board_semantic as board_semantic_service

router = APIRouter(prefix="/board", tags=["board"])


@router.post("/semantic", response_model=BoardSemanticResponse | None)
async def analyze_board_semantic(
    payload: BoardSemanticRequest,
    current_user: CurrentUser = Depends(get_current_user),
) -> BoardSemanticResponse | None:
    """LLM-enrich the rule-computed clusters for a board selection.

    Returns null when disabled or on AI failure — caller keeps rule results.
    """
    return await board_semantic_service.analyze_board_semantic(
        payload, user_id=str(current_user.id)
    )
