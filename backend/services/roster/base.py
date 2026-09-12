"""The channel-agnostic roster contract.

Business code talks to this, never to a specific LMS. LTI and Google Classroom
are two very different protocols (signed launch + NRPS vs OAuth + REST), so
without this seam the second integration would duplicate all of the class /
enrolment logic. Adding Teams or OneRoster later should mean adding an
implementation, not touching callers.
"""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class RosteredClass:
    """A class as the external platform knows it."""

    external_class_id: str
    name: str


@dataclass(frozen=True)
class RosteredMember:
    """A person in a class, as the external platform knows them.

    `external_user_id` is the platform's stable identifier (LTI `sub`,
    Classroom `userId`) — never an email address.
    """

    external_user_id: str
    role: str  # "student" | "teacher" | "admin"
    display_name: str | None = None
    email: str | None = None


class RosterProvider(Protocol):
    """What every LMS channel must be able to do."""

    provider: str

    async def list_classes(self, integration_id: str) -> list[RosteredClass]:
        """Classes the acting user can see through this integration."""
        ...

    async def list_members(
        self, integration_id: str, external_class_id: str
    ) -> list[RosteredMember]:
        """Members of one class, with their roles."""
        ...
