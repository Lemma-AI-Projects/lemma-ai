"""API contract for the Method layer.

Wire format is camelCase, same convention as the rest of `schemas/`.

The list is served from the registry (`ai/methods`) rather than declared here:
a fixed `Literal` would mean adding a method requires editing the schema, the
frontend and the tests — three copies of one fact. Whether a *requested* name is
valid is answered by the same registry (see `schemas/ai.py`).
"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class MethodOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    # Stable id used on the wire and stored on the conversation.
    name: str
    # What the picker shows. English product name; the frontend may localise it.
    display_name: str
    # One sentence for the picker's helper text — how this method teaches.
    description: str
