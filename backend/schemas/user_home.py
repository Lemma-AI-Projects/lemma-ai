"""API contracts for User Home.

Wire format is camelCase (same convention as `schemas/doc.py` and
`schemas/knowledge.py`).

Two shapes are worth reading before using them:

  - `UserHomeOut` splits the items by `kind` AND by `status`. `interests` and
    `preferences` are the confirmed rows — facts the learner owns. `candidates`
    are proposals nobody has answered yet. They are separate lists rather than
    one list with a flag because a caller that merges them by accident would be
    showing a guess as a fact, and that is the one mistake this feature exists to
    prevent.
  - `nickname` rides here even though it lives in `profiles`. It is the same
    person, the page shows it in About Me, and a second round-trip for one
    string would be a worse trade than composing it in one place. The write path
    for it is still `PATCH /users/me` — the owner of the field did not move.
"""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

HomeItemKind = Literal["interest", "preference"]
HomeItemStatus = Literal["candidate", "confirmed"]


class _Camel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


class UserHomeItemOut(_Camel):
    id: uuid.UUID
    kind: HomeItemKind
    text: str
    status: HomeItemStatus
    #: `user` = the learner typed it; `agent` = the agent proposed it. Kept even
    #: after confirmation, so "the agent suggested this and I agreed" stays
    #: visible instead of being laundered into something the user wrote.
    origin: Literal["user", "agent"]
    source_space_id: uuid.UUID | None = None
    created_at: datetime
    confirmed_at: datetime | None = None


class UserHomeOut(_Camel):
    nickname: str | None = None
    language: str | None = None
    background: str | None = None
    #: Whether Lemma's analysis may fill that section in for this person. Sent
    #: with every read because the switches are part of the page's state, not a
    #: setting the frontend should have to remember. `True` is the product
    #: default — see `models/user_home.py` for why it is not `False`.
    auto_about: bool = True
    auto_interests: bool = True
    auto_preferences: bool = True
    interests: list[UserHomeItemOut] = Field(default_factory=list)
    preferences: list[UserHomeItemOut] = Field(default_factory=list)
    candidates: list[UserHomeItemOut] = Field(default_factory=list)


class UserHomeAboutIn(_Camel):
    """Partial update: only the fields sent are written.

    `None` is a real value here ("clear this line"), so the API layer reads
    `model_fields_set` rather than `is not None` — otherwise clearing a field
    would be impossible to express.

    The three `auto*` switches ride the same request because they are the same
    kind of thing: one scalar the page owns. A second endpoint would only add a
    way for the two to disagree.
    """

    language: str | None = Field(default=None, max_length=32)
    #: 2000, not 500: the field is a text area now, and "转行做了三年后端，本科
    #: 计算机，正在补数学" is one sentence a person actually writes. The column
    #: has always been `Text`; only this bound was tighter than the storage.
    background: str | None = Field(default=None, max_length=2000)
    auto_about: bool | None = None
    auto_interests: bool | None = None
    auto_preferences: bool | None = None


class BackgroundFromUrlIn(_Camel):
    """Ask Lemma to read a page and draft the background from it."""

    url: str = Field(min_length=8, max_length=2048)


class BackgroundDraftOut(_Camel):
    """A draft, never a write.

    The page puts this in the text area; the learner still presses save. That is
    the same rule the agent lives under everywhere else in this feature — nothing
    enters Home except through the person it is about.
    """

    background: str
    #: The page's own title, so the learner can tell which link this came from
    #: without re-reading the URL.
    source_title: str | None = None


class UserHomeItemIn(_Camel):
    kind: HomeItemKind
    text: str = Field(min_length=1, max_length=280)


class UserHomeItemPatch(_Camel):
    text: str | None = Field(default=None, min_length=1, max_length=280)
    #: `confirmed` is what the user's "Save to Home" button sends. There is no
    #: route back to `candidate`: once a person has said yes, the row is theirs.
    status: Literal["confirmed"] | None = None


class SpacePreferenceOut(_Camel):
    """One standing preference of a Learn Space — the middle layer.

    Deliberately a different type from `UserHomeItemOut`: a space preference has
    no `kind`, no `status` and no `origin`, because it is never a candidate and
    never split into sections. Keeping the shapes apart makes "this is global"
    and "this is local" visible at the type level, which is where the
    conversation/space/home rule is easiest to get wrong.
    """

    id: uuid.UUID
    project_id: uuid.UUID
    text: str
    created_at: datetime


class SpacePreferenceIn(_Camel):
    text: str = Field(min_length=1, max_length=280)
    #: Optional: which conversation this preference was stated in. Provenance
    #: only — it never changes who owns the row.
    source_conversation_id: uuid.UUID | None = None
