"""API contracts for conversation CRUD (rules 第十章). Wire format is camelCase."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel


class ConversationOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    title: str | None
    updated_at: datetime


class ConversationDetailOut(BaseModel):
    """Single-conversation detail: the chat page's own source of truth.

    List caches can't serve this — the main list excludes project-homed
    conversations by design, so title/project lookups by id need a real
    endpoint (bug found 2026-06-13: rename dialog opened empty for them).
    """

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    title: str | None
    project_id: uuid.UUID | None
    updated_at: datetime


class ConversationMessageOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    role: Literal["system", "user", "assistant"]
    # DB column is content_text (dual-track storage); the wire keeps the same
    # `content` name the chat request uses.
    content: str = Field(validation_alias="content_text")
    created_at: datetime


class ConversationUpdateIn(BaseModel):
    """PATCH payload: rename and/or move between projects.

    projectId has move-out semantics on explicit null — "field absent" and
    "field: null" mean different things, distinguished via model_fields_set.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    title: str | None = Field(default=None, min_length=1, max_length=200)
    # set uuid -> move into that project; set null -> move out to main list
    project_id: uuid.UUID | None = None

    @property
    def moves_project(self) -> bool:
        return "project_id" in self.model_fields_set

    @model_validator(mode="after")
    def at_least_one_field(self) -> "ConversationUpdateIn":
        if self.title is None and not self.moves_project:
            raise ValueError("provide title and/or projectId")
        return self
