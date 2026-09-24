"""Method registry read endpoint.

Read-only on purpose. Choosing a method is a property of a conversation (it is
sent with the chat turn and stored on `ai_conversations.method`), so there is no
"set the current method" call here to get out of sync with what the next turn
will actually use.
"""

from fastapi import APIRouter, Depends

from core.security import CurrentUser, get_current_user
from schemas.method import MethodOut
from services import method_service

router = APIRouter(prefix="/methods", tags=["methods"])


@router.get("", response_model=list[MethodOut])
async def list_methods(
    current_user: CurrentUser = Depends(get_current_user),
) -> list[dict[str, str]]:
    """Every method this build can run, in registry order."""
    return method_service.list_methods()
