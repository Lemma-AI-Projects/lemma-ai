"""User Home: the read/write surface of the Global User Layer.

Two halves, one owner:

  - the **single-valued** half (`user_home.language` / `.background`), written by
    the Home page;
  - the **list-shaped** half (`user_home_items`: interests, preferences), written
    either by the Home page or by the agent as a *candidate* the user then
    confirms.

The rule this module exists to enforce is that the agent never writes Home
silently. `add_item` defaults to `status="confirmed", origin="user"` for the
learner's own edits, and the agent's tool calls it with
`status="candidate", origin="agent"` — a row that is visible, dismissible, and
**excluded from every prompt** until a human flips it. Confirming is a single
column update, so there is never a moment when a proposal and a fact exist as
two different rows.

Nothing here is space-scoped. That is the whole point of the layer: a Home row
has no project_id, so "the same Home in every space" is structural rather than
something the callers have to remember.
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.ai_conversation import AiConversation
from models.user_home import (
    HOME_ITEM_KINDS,
    HOME_ITEM_ORIGINS,
    HOME_ITEM_STATUSES,
    UserHome,
    UserHomeItem,
)

#: One confirmed preference line, plus where it came from. Ordered most-specific
#: first by `preference_layers`, which is the only place that decides priority.
@dataclass(frozen=True)
class PreferenceLayer:
    scope: str  # 'conversation' | 'space' | 'home'
    text: str


#: What the agent is told it knows about this person, before any prompt text is
#: written. `interests` and `preferences` are confirmed rows only.
@dataclass(frozen=True)
class UserHomeContext:
    language: str | None
    background: str | None
    interests: list[str]
    preferences: list[str]
    #: Proposals the user has not answered yet — carried so the UI and the agent
    #: can mention them, never so they can be applied.
    candidates: list[str]

    @property
    def is_empty(self) -> bool:
        return not (
            self.language or self.background or self.interests or self.preferences
        )


def preference_layers(
    *,
    home: list[str],
    space: list[str],
    conversation: str | None = None,
) -> list[PreferenceLayer]:
    """How teaching preferences stack up, most specific first.

    The order IS the rule the product promised: what the learner asked for in
    this turn beats what this space asked for, which beats what their Home says.
    It is a list rather than a merged string because merging is where the rule
    gets lost — a caller that wants one answer can take the first layer, and a
    prompt can show all of them with their scopes attached.

    Everything here is read-only. Reaching a narrower layer never writes a wider
    one: a one-off "explain this in detail" cannot edit Home, because no code
    path in this function (or its callers) writes anything.
    """
    layers: list[PreferenceLayer] = []
    if conversation:
        layers.append(PreferenceLayer(scope="conversation", text=conversation))
    layers.extend(
        PreferenceLayer(scope="space", text=text) for text in space if text.strip()
    )
    layers.extend(
        PreferenceLayer(scope="home", text=text) for text in home if text.strip()
    )
    return layers


# --- the single row ---------------------------------------------------------


async def get_home(db: AsyncSession, *, user_id: uuid.UUID) -> UserHome | None:
    """The row, or None. None is a real answer: nothing is known yet."""
    return await db.get(UserHome, user_id)


#: Distinguishes "leave this field alone" from "clear it". `None` cannot do both,
#: and clearing a line the user no longer wants to state is a real request.
_UNSET: Any = object()


async def update_about(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    language: Any = _UNSET,
    background: Any = _UNSET,
) -> UserHome:
    """Write the About Me fields, creating the row on first write.

    Only the fields actually passed are touched: an omitted argument means "leave
    it alone", while passing `None` (or a blank string) clears the field. The API
    layer decides which is which from the request's own field set, so a client
    can send one field, or send `null` to reset one.
    """
    home = await db.get(UserHome, user_id)
    if home is None:
        home = UserHome(user_id=user_id)
        db.add(home)
    if language is not _UNSET:
        home.language = (language or "").strip() or None
    if background is not _UNSET:
        home.background = (background or "").strip() or None
    await db.commit()
    await db.refresh(home)
    return home


# --- the list-shaped half ---------------------------------------------------


async def list_items(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    kind: str | None = None,
    status: str = "confirmed",
) -> list[UserHomeItem]:
    """This user's items, oldest first.

    Oldest first is deliberate: Home reads as a list the person has been
    building, not as a feed. New items arriving at the bottom matches where the
    "add" control is.
    """
    statement = select(UserHomeItem).where(
        UserHomeItem.user_id == user_id, UserHomeItem.status == status
    )
    if kind is not None:
        statement = statement.where(UserHomeItem.kind == kind)
    rows = (await db.execute(statement.order_by(UserHomeItem.created_at))).scalars()
    return list(rows)


async def list_candidates(db: AsyncSession, *, user_id: uuid.UUID) -> list[UserHomeItem]:
    """Proposals waiting for a yes. Never reads as a fact anywhere else."""
    return await list_items(db, user_id=user_id, status="candidate")


async def add_item(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    kind: str,
    text: str,
    status: str = "confirmed",
    origin: str = "user",
    conversation_id: uuid.UUID | None = None,
    project_id: uuid.UUID | None = None,
) -> tuple[UserHomeItem, bool]:
    """Add one line, or return the identical one that is already there.

    Returns `(row, created)`. Deduplicating on (kind, text, status) rather than
    blocking duplicates keeps the caller honest: a repeated proposal answer says
    "already proposed" instead of stacking three copies the user must dismiss
    three times.
    """
    if kind not in HOME_ITEM_KINDS:
        raise ValueError(f"unknown home item kind: {kind}")
    if status not in HOME_ITEM_STATUSES:
        raise ValueError(f"unknown home item status: {status}")
    if origin not in HOME_ITEM_ORIGINS:
        raise ValueError(f"unknown home item origin: {origin}")
    cleaned = " ".join(text.split())
    if not cleaned:
        raise ValueError("home item text must not be blank")

    existing = (
        await db.execute(
            select(UserHomeItem).where(
                UserHomeItem.user_id == user_id,
                UserHomeItem.kind == kind,
                UserHomeItem.status == status,
                func.lower(UserHomeItem.text) == cleaned.lower(),
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing, False

    item = UserHomeItem(
        user_id=user_id,
        kind=kind,
        text=cleaned,
        status=status,
        origin=origin,
        source_conversation_id=conversation_id,
        source_space_id=project_id,
        confirmed_at=datetime.now(UTC) if status == "confirmed" else None,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item, True


async def update_item(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    item_id: uuid.UUID,
    text: str | None = None,
    status: str | None = None,
) -> UserHomeItem | None:
    """Edit text, or move a candidate to confirmed.

    Confirming is this function with `status="confirmed"`: one row changes, and
    `confirmed_at` is stamped at that moment. The row keeps its `origin="agent"`,
    so "the agent suggested this and I agreed" stays visible afterwards.
    """
    item = await _owned_item(db, user_id=user_id, item_id=item_id)
    if item is None:
        return None
    if text is not None:
        cleaned = " ".join(text.split())
        if not cleaned:
            raise ValueError("home item text must not be blank")
        item.text = cleaned
    if status is not None:
        if status not in HOME_ITEM_STATUSES:
            raise ValueError(f"unknown home item status: {status}")
        item.status = status
        item.confirmed_at = datetime.now(UTC) if status == "confirmed" else None
    await db.commit()
    await db.refresh(item)
    return item


async def delete_item(
    db: AsyncSession, *, user_id: uuid.UUID, item_id: uuid.UUID
) -> bool:
    """Forget one line. Used for both "remove from Home" and "ignore proposal"."""
    item = await _owned_item(db, user_id=user_id, item_id=item_id)
    if item is None:
        return False
    await db.delete(item)
    await db.commit()
    return True


async def _owned_item(
    db: AsyncSession, *, user_id: uuid.UUID, item_id: uuid.UUID
) -> UserHomeItem | None:
    """The user's own row, or None.

    Scoping by `user_id` in the query rather than checking ownership after the
    fetch keeps "not yours" and "does not exist" the same answer, which is the
    rule the rest of this codebase follows.
    """
    return (
        await db.execute(
            select(UserHomeItem).where(
                UserHomeItem.id == item_id, UserHomeItem.user_id == user_id
            )
        )
    ).scalar_one_or_none()


# --- the agent-facing read --------------------------------------------------


async def read_user_home(db: AsyncSession, *, user_id: uuid.UUID) -> UserHomeContext:
    """Everything the Global Agent may know about this person. One call.

    This is the `getUserHome(userId)` the context assembly asks for. It is
    intentionally not a prompt: what reaches the model is decided in
    `ai/prompts/user_home.py`, so a change to the wording never touches storage
    and a change to storage never touches the wording.

    Confirmed rows only — a candidate is a question, and answering it is the
    user's job, not the model's.
    """
    home = await get_home(db, user_id=user_id)
    confirmed = await list_items(db, user_id=user_id, status="confirmed")
    candidates = await list_candidates(db, user_id=user_id)
    return UserHomeContext(
        language=home.language if home else None,
        background=home.background if home else None,
        interests=[row.text for row in confirmed if row.kind == "interest"],
        preferences=[row.text for row in confirmed if row.kind == "preference"],
        candidates=[row.text for row in candidates],
    )


async def conversation_note(
    db: AsyncSession, *, conversation_id: uuid.UUID | None
) -> str | None:
    """The conversation's own teaching instruction, if it has one.

    `ai_conversations.method` is the only conversation-scoped preference the
    product stores today, and it belongs to the conversation: another
    conversation in the same space may choose differently, and it never edits
    Home.
    """
    if conversation_id is None:
        return None
    method = (
        await db.execute(
            select(AiConversation.method).where(AiConversation.id == conversation_id)
        )
    ).scalar_one_or_none()
    return method or None


async def prune_orphans(db: AsyncSession, *, user_id: uuid.UUID) -> int:
    """Drop Home rows whose source is gone and that nobody confirmed.

    A candidate proposed inside a conversation that was later deleted has lost
    the context a user needs to judge it — keeping it would show a proposal the
    page cannot explain. Confirmed rows are never touched: their provenance is
    trivia, the fact is theirs.
    """
    result = await db.execute(
        delete(UserHomeItem).where(
            UserHomeItem.user_id == user_id,
            UserHomeItem.status == "candidate",
            UserHomeItem.source_conversation_id.is_not(None),
            ~UserHomeItem.source_conversation_id.in_(
                select(AiConversation.id).where(AiConversation.user_id == user_id)
            ),
        )
    )
    await db.commit()
    return int(result.rowcount or 0)
