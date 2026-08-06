"""Learn space onboarding endpoints (v1): agent draft generation."""

from fastapi import APIRouter, Depends

from core.security import CurrentUser, get_current_user
from schemas.learn_space import AgentDraftIn, AgentDraftOut
from services import learn_space as learn_space_service

router = APIRouter(prefix="/learn-spaces", tags=["learn-spaces"])


@router.post("/agent-draft", response_model=AgentDraftOut)
async def create_agent_draft(
    payload: AgentDraftIn,
    current_user: CurrentUser = Depends(get_current_user),
) -> AgentDraftOut:
    """Generate a companion agent draft (no persistence).

    Optional user preferences (name / personality / teaching style) steer the
    generation — templates and custom setups both pass through here.
    """
    return await learn_space_service.generate_agent_draft(
        payload, user_id=str(current_user.id)
    )
