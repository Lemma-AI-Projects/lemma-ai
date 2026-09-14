"""API contracts for the doc layer (pages/blocks). Wire format is camelCase."""

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

PageKind = Literal["note", "canvas", "imported", "folder"]
PageSource = Literal["manual", "obsidian", "notion", "upload"]
BlockType = Literal[
    "paragraph",
    "heading",
    "list",
    "todo",
    "code",
    "quote",
    "divider",
    "image",
    "math",
    "callout",
]


class PageCreateIn(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    project_id: uuid.UUID
    title: str = Field(min_length=1, max_length=300)
    kind: PageKind = "note"
    parent_page_id: uuid.UUID | None = None


class PageUpdateIn(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    title: str | None = Field(default=None, min_length=1, max_length=300)
    kind: PageKind | None = None
    parent_page_id: uuid.UUID | None = None


class PageOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    project_id: uuid.UUID
    parent_page_id: uuid.UUID | None
    title: str
    kind: PageKind
    source: PageSource
    import_ref: str | None
    updated_at: datetime


class PageWithProjectOut(BaseModel):
    """Cross-space list item (/knowledge): a page plus its owning space name."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: uuid.UUID
    project_id: uuid.UUID
    project_name: str
    parent_page_id: uuid.UUID | None
    title: str
    kind: PageKind
    source: PageSource
    import_ref: str | None
    updated_at: datetime


class BlockIn(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: uuid.UUID | None = None
    type: BlockType
    position: int
    content: dict[str, Any]
    meta: dict[str, Any] | None = None


class BlocksPutIn(BaseModel):
    """Full-page block save. `updated_at` is an optimistic-concurrency guard:
    the client sends the page version it last saw; a mismatch is a 409 that
    overrides without silently dropping the other writer's change."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    blocks: list[BlockIn]
    updated_at: datetime


class PageBlocksOut(BaseModel):
    """A page plus its ordered blocks, the editor's read/write envelope."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    kind: PageKind
    updated_at: datetime
    blocks: list[dict[str, Any]]