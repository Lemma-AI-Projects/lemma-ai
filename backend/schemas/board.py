"""API contracts for board snapshot persistence (P0)."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class BoardSnapshotIn(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    snapshot: dict[str, Any]


class BoardSnapshotOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    project_id: uuid.UUID
    snapshot: dict[str, Any]
    updated_at: datetime