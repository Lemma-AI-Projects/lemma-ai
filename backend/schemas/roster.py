"""API contracts for roster/LTI endpoints (wire format camelCase)."""

import uuid

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class LaunchResponse(_CamelModel):
    """Legacy contract for a verified LTI launch.

    NOTE: `/api/v1/lti/launch` no longer returns this. A launch now provisions
    the LMS user (Supabase admin) and responds with a 302 to a one-time
    Supabase passwordless sign-in link, handing the browser a real session. This
    model is retained only for any out-of-band callers that previously decoded
    the JSON response.
    """

    user_id: uuid.UUID
    class_id: uuid.UUID | None = None
    role: str
    display_name: str | None = None
    context_title: str | None = None
