"""Boundary types produced by qbank/ for services/.

view / review are already wire-shaped (camelCase dicts); their contract
truth is schemas/question.py, which validates them on the way out. slot_map is
the grader's private input: it carries reference answers and never reaches the
wire.
"""

import hashlib
import json
from typing import Any, Literal

from pydantic import BaseModel, Field

from qbank.xkw.types import QuestionQuery

Structure = Literal["parsed", "raw"]


class BuildSpec(BaseModel):
    """What a question set is built from (question_sets.query_spec_json)."""

    xkw_course_id: int
    kpoint_ids: list[int] = Field(default_factory=list)
    catalog_ids: list[int] = Field(default_factory=list)
    type_ids: list[str] = Field(default_factory=list)
    difficulty_levels: list[int] = Field(default_factory=list)
    count: int = Field(default=5, ge=1, le=10)

    def spec_hash(self) -> str:
        """Order-insensitive identity of the query (empty-result cache key)."""
        canonical = {
            "course": self.xkw_course_id,
            "kpoints": sorted(self.kpoint_ids),
            "catalogs": sorted(self.catalog_ids),
            "types": sorted(self.type_ids),
            "levels": sorted(self.difficulty_levels),
            "count": self.count,
        }
        return hashlib.sha256(json.dumps(canonical, sort_keys=True).encode()).hexdigest()[:32]

    def to_query(self, *, session_id: str | None) -> QuestionQuery:
        # Always ask for the XKW maximum: candidates are filtered to
        # machine-gradable ones afterwards, so over-fetch within one call.
        return QuestionQuery(
            course_id=self.xkw_course_id,
            kpoint_ids=self.kpoint_ids,
            catalog_ids=self.catalog_ids,
            type_ids=self.type_ids,
            difficulty_levels=self.difficulty_levels,
            count=10,
            session_id=session_id,
        )
ParseStatus = Literal["parsed", "raw", "failed"]


class ParsedQuestion(BaseModel):
    parser_version: int
    content_version: str
    structure: Structure
    parse_status: ParseStatus
    # QuestionView minus nothing: id and contentVersion are included.
    view: dict[str, Any]
    # QuestionReview: reference answers + explanation (secret until graded).
    review: dict[str, Any]
    # {"slots": {slotId: {...}}, "optionGroups": {ogId: {...}}}
    slot_map: dict[str, Any] = Field(default_factory=dict)
    degraded_slot_count: int = 0

    @property
    def fully_auto_gradable(self) -> bool:
        """Every answerable slot is machine-gradable (the set-picking rule)."""
        slots = self.slot_map.get("slots", {})
        return (
            self.structure == "parsed"
            and bool(slots)
            and all(spec.get("grading") == "auto" for spec in slots.values())
        )
