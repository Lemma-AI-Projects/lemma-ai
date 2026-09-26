"""User Home endpoints — the Global User Layer's only read/write surface.

Everything here is about the PERSON and nothing here is scoped to a space. That
is the point of the module: whatever a caller does to Home, the change is visible
in every Learn Space on the next turn, because the rows have no project_id to be
scoped by.

Three rules the endpoints enforce rather than document:

  - **Nothing writes a confirmed preference except the learner.** `POST /items`
    is the user's own edit (it writes `origin="user"`, confirmed). The agent's
    only way in is `POST /candidates`, which writes a proposal that no prompt
    reads until a person confirms it.
  - **Confirming is explicit.** `POST /candidates/{id}/confirm` exists so the
    moment of "yes" is a user action with a row to point at, not a side effect of
    a conversation.
  - **Space preferences are not here.** They live under the space's own API
    (`/projects/{id}/preferences`) so that the two layers cannot be written
    through one endpoint by mistake.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import CurrentUser, get_current_user
from schemas.user_home import (
    UserHomeAboutIn,
    UserHomeItemIn,
    UserHomeItemOut,
    UserHomeItemPatch,
    UserHomeOut,
)
from services import user_home_service
from services.user_service import get_or_create_profile

router = APIRouter(prefix="/users/me/home", tags=["user-home"])

DbSession = Annotated[AsyncSession, Depends(get_db)]
Caller = Annotated[CurrentUser, Depends(get_current_user)]


def _item_out(item) -> UserHomeItemOut:
    return UserHomeItemOut.model_validate(item, from_attributes=True)


async def _home_out(db: AsyncSession, *, user_id: uuid.UUID) -> UserHomeOut:
    """One round trip for the whole page.

    `nickname` comes from `profiles` because the page shows it and it belongs to
    the same person; composing it here keeps the frontend at one request without
    moving the field's owner.
    """
    home = await user_home_service.get_home(db, user_id=user_id)
    confirmed = await user_home_service.list_items(db, user_id=user_id)
    candidates = await user_home_service.list_candidates(db, user_id=user_id)
    profile = await get_or_create_profile(db, user_id=user_id, email=None)
    return UserHomeOut(
        nickname=profile.nickname,
        language=home.language if home else None,
        background=home.background if home else None,
        interests=[
            _item_out(item) for item in confirmed if item.kind == "interest"
        ],
        preferences=[
            _item_out(item) for item in confirmed if item.kind == "preference"
        ],
        candidates=[_item_out(item) for item in candidates],
    )


@router.get("", response_model=UserHomeOut)
async def read_home(db: DbSession, caller: Caller) -> UserHomeOut:
    """The whole Home: about, interests, preferences, and pending proposals.

    A user who has never filled anything in gets empty lists and a 200 — an
    empty Home is a state, not an error, and the page has something to say about
    it ("tell Lemma what to remember").
    """
    return await _home_out(db, user_id=caller.id)


@router.patch("", response_model=UserHomeOut)
async def update_about(
    payload: UserHomeAboutIn, db: DbSession, caller: Caller
) -> UserHomeOut:
    """Write About Me. Fields not sent are left alone.

    `model_fields_set` rather than `is not None`: sending `{"background": null}`
    has to mean "clear it", which is a different request from not sending it —
    so only the fields the client actually mentioned reach the service.
    """
    sent = payload.model_fields_set
    patch: dict = {}
    if "language" in sent:
        patch["language"] = payload.language
    if "background" in sent:
        patch["background"] = payload.background
    await user_home_service.update_about(db, user_id=caller.id, **patch)
    return await _home_out(db, user_id=caller.id)


@router.post("/items", response_model=UserHomeItemOut, status_code=201)
async def add_item(
    payload: UserHomeItemIn, db: DbSession, caller: Caller
) -> UserHomeItemOut:
    """The learner adds a line themselves — a fact from the moment it is written."""
    try:
        item, created = await user_home_service.add_item(
            db,
            user_id=caller.id,
            kind=payload.kind,
            text=payload.text,
            status="confirmed",
            origin="user",
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not created:
        # Same line already there. 200-with-the-row would be a lie about having
        # written something; 409 says what happened and the client refetches.
        raise HTTPException(status_code=409, detail="already in Home")
    return _item_out(item)


@router.patch("/items/{item_id}", response_model=UserHomeItemOut)
async def update_item(
    item_id: uuid.UUID, payload: UserHomeItemPatch, db: DbSession, caller: Caller
) -> UserHomeItemOut:
    """Edit a line's text, or confirm a proposal.

    Also the confirmation endpoint for a candidate: `{"status": "confirmed"}`.
    Kept as one route because it is one row changing — a second route would
    invite the two to drift apart.
    """
    try:
        item = await user_home_service.update_item(
            db,
            user_id=caller.id,
            item_id=item_id,
            text=payload.text,
            status=payload.status,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if item is None:
        raise HTTPException(status_code=404, detail="not found")
    return _item_out(item)


@router.delete("/items/{item_id}", status_code=204)
async def delete_item(item_id: uuid.UUID, db: DbSession, caller: Caller) -> Response:
    """Forget one line. The same call removes a candidate ("Ignore")."""
    removed = await user_home_service.delete_item(
        db, user_id=caller.id, item_id=item_id
    )
    if not removed:
        raise HTTPException(status_code=404, detail="not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/candidates", response_model=list[UserHomeItemOut])
async def list_candidates(db: DbSession, caller: Caller) -> list[UserHomeItemOut]:
    """Proposals waiting for an answer. Never used in a prompt while pending."""
    rows = await user_home_service.list_candidates(db, user_id=caller.id)
    return [_item_out(row) for row in rows]


@router.post("/candidates", response_model=UserHomeItemOut, status_code=201)
async def propose_candidate(
    payload: UserHomeItemIn,
    db: DbSession,
    caller: Caller,
    conversation_id: uuid.UUID | None = None,
    project_id: uuid.UUID | None = None,
) -> UserHomeItemOut:
    """Propose a line for Home **without** it counting as Home yet.

    This is the agent's entry point (`propose_home_preference` calls the same
    service function in-process). It exists as an endpoint as well so the flow is
    testable on its own and so a future client can offer the same thing without
    going through a conversation.

    Whatever the model believes, this call cannot produce a fact: the row lands
    as `status="candidate"`, `origin="agent"`, and every prompt only reads
    confirmed rows. The user's answer is a separate, explicit request.
    """
    try:
        item, created = await user_home_service.add_item(
            db,
            user_id=caller.id,
            kind=payload.kind,
            text=payload.text,
            status="candidate",
            origin="agent",
            conversation_id=conversation_id,
            project_id=project_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not created:
        raise HTTPException(status_code=409, detail="already proposed")
    return _item_out(item)
