"""API contracts for roster/LTI endpoints (wire format camelCase)."""

import uuid

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class LaunchResponse(_CamelModel):
    """Result of a verified LTI launch.

    No session token is minted here yet: handing out a Lemma session for an LMS
    user is a separate, security-sensitive step (Supabase admin provisioning),
    so this endpoint reports what it resolved instead of pretending to log
    anyone in.
    """

    user_id: uuid.UUID
    class_id: uuid.UUID | None = None
    role: str
    display_name: str | None = None
    context_title: str | None = None
