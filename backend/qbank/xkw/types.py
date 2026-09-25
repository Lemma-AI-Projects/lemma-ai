"""Boundary types for the XKW layer. Raw provider payloads never leave
qbank/xkw; everything upstream sees these shapes."""

from typing import Any, Literal

from pydantic import BaseModel, Field

SourceKind = Literal["premium", "massive", "paper", "other"]


class CallContext(BaseModel):
    """Accounting context attached to every XKW call (qbank_usage_logs)."""

    use_case: str
    trace_id: str
    user_id: str | None = None
    question_set_id: str | None = None


class QuestionQuery(BaseModel):
    """/xopqbm/questions request (04 L54-71). Lists are capped at 10 by XKW."""

    course_id: int
    kpoint_ids: list[int] = Field(default_factory=list)
    catalog_ids: list[int] = Field(default_factory=list)
    type_ids: list[str] = Field(default_factory=list)
    difficulty_levels: list[int] = Field(default_factory=list)
    count: int = Field(default=10, ge=1, le=10)
    session_id: str | None = None
    textbook_id: int | None = None
    version_id: int | None = None
    formula_pic_format: str = "svg"

    def to_body(self) -> dict[str, Any]:
        body: dict[str, Any] = {
            "course_id": self.course_id,
            "kpoint_ids": self.kpoint_ids[:10],
            "catalog_ids": self.catalog_ids[:10],
            "type_ids": self.type_ids[:10],
            "difficulty_levels": self.difficulty_levels[:5],
            "count": self.count,
            "formula_pic_format": self.formula_pic_format,
        }
        if self.session_id:
            body["session_id"] = self.session_id
        if self.textbook_id is not None:
            body["textbook_id"] = self.textbook_id
        if self.version_id is not None:
            body["version_id"] = self.version_id
        return body


class XkwQuestionRaw(BaseModel):
    """One question exactly as XKW returned it (three HTML fields + metadata)."""

    id: str
    stem: str
    answer: str = ""
    explanation: str = ""
    source_kind: SourceKind = "premium"
    course_id: int | None = None
    course_name: str | None = None
    type_id: str | None = None
    type_name: str | None = None
    difficulty: float | None = None
    difficulty_level: int | None = None
    answer_scoreable: bool | None = None
    media: int | None = None
    kpoints: list[dict[str, Any]] = Field(default_factory=list)
    catalogs: list[dict[str, Any]] = Field(default_factory=list)
    tags: list[dict[str, Any]] = Field(default_factory=list)
    years: list[int] = Field(default_factory=list)
    source_papers: list[dict[str, Any]] = Field(default_factory=list)
    # Everything else, untouched (en_words, exp_video_posters, css/js, ...).
    extra: dict[str, Any] = Field(default_factory=dict)

    @classmethod
    def from_payload(
        cls, item: dict[str, Any], *, source_kind: SourceKind = "premium"
    ) -> "XkwQuestionRaw":
        """Tolerant mapping: endpoint tables are snake_case, 接入指引/04's
        example is camelCase — accept both."""

        def pick(*keys: str) -> Any:
            for key in keys:
                if key in item and item[key] is not None:
                    return item[key]
            return None

        type_obj = pick("type") or {}
        course_obj = pick("course") or {}
        known = {
            "id", "stem", "answer", "explanation", "course_id", "courseId",
            "course", "type_id", "typeId", "type", "difficulty",
            "difficulty_level", "difficultyLevel", "answer_scoreable",
            "answerScoreable", "media", "kpoints", "catalogs", "tags", "years",
            "source_papers", "sourcePapers",
        }
        scoreable = pick("answer_scoreable", "answerScoreable")
        return cls(
            id=str(pick("id") or ""),
            stem=pick("stem") or "",
            answer=pick("answer") or "",
            explanation=pick("explanation") or "",
            source_kind=source_kind,
            course_id=pick("course_id", "courseId") or course_obj.get("id"),
            course_name=course_obj.get("name") if isinstance(course_obj, dict) else None,
            type_id=pick("type_id", "typeId")
            or (type_obj.get("id") if isinstance(type_obj, dict) else None),
            type_name=type_obj.get("name") if isinstance(type_obj, dict) else None,
            difficulty=pick("difficulty"),
            difficulty_level=pick("difficulty_level", "difficultyLevel"),
            answer_scoreable=None if scoreable is None else bool(scoreable),
            media=pick("media"),
            kpoints=pick("kpoints") or [],
            catalogs=pick("catalogs") or [],
            tags=pick("tags") or [],
            years=pick("years") or [],
            source_papers=pick("source_papers", "sourcePapers") or [],
            extra={key: value for key, value in item.items() if key not in known},
        )


class XkwResult(BaseModel):
    """Normalized result of one XKW call, whatever envelope it came in."""

    items: list[Any] = Field(default_factory=list)
    session_id: str | None = None
    page_index: int | None = None
    total_page: int | None = None
    raw_code: int | None = None
    billable: bool = True


class XkwQuestionPage(BaseModel):
    questions: list[XkwQuestionRaw] = Field(default_factory=list)
    session_id: str | None = None
    billable: bool = True
    total_page: int | None = None
