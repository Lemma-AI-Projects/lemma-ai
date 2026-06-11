"""API contracts for conversation CRUD (rules 第十章). Wire format is camelCase."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class ConversationOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    title: str | None
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


class ConversationRenameIn(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    title: str = Field(min_length=1, max_length=200)
