"""Course-generation product + AI-IO types.

The first three are the cross-layer products Phase 4/5 consume — their fields are
fixed (don't drift). They carry NO DB fields (id / order_index / status /
progress): those are generated at persist time. The rest are internal LLM
input/output shapes (a ChapterPlan in, query-expansion / selection structures
out) — they never leave the coursegen pipeline.

This module imports only pydantic and the ai/search boundary type; it must never
touch models/, sqlalchemy, celery, tasks/ or apify_client.
"""

from pydantic import BaseModel, Field

from ai.search.types import VideoCandidate

# --- Products (Phase 4/5 consume; field shapes are fixed) ---


class QuestionnaireQuestion(BaseModel):
    # AI-generated stable slug (e.g. "current-level"); unique within a survey.
    id: str
    title: str
    options: list[str]


class Questionnaire(BaseModel):
    """Same shape as schemas.course.QuestionnaireOut (Phase 4 turns it into the
    wire contract directly)."""

    questions: list[QuestionnaireQuestion]


class OutlineChapter(BaseModel):
    title: str
    summary: str


class OutlineUnit(BaseModel):
    title: str
    chapters: list[OutlineChapter]


class CourseOutline(BaseModel):
    """The pure AI outline: titles + per-chapter summary, nested units→chapters.

    Intentionally NOT the same as schemas.course.CourseOutlineOut: that one is
    the DB-shaped read tree (id/status/progress, no summary). Phase 4 assigns
    ids/order/status when it persists this and stores `summary` on the chapter
    row.
    """

    title: str
    units: list[OutlineUnit]


class ChapterResearchResult(BaseModel):
    """Outcome of researching one chapter. `chosen` is one of `candidates` (the
    same object) so Phase 5 can flag it is_chosen; None (with a reason) when
    nothing fit or search/selection failed — research never raises, so one bad
    chapter is marked failed instead of sinking the whole course."""

    candidates: list[VideoCandidate]
    chosen: VideoCandidate | None = None
    reason: str


# --- Inputs / internal LLM-IO (never cross the coursegen boundary) ---


class ChapterPlan(BaseModel):
    """What research_chapter needs to know about one chapter (title + summary;
    the learner profile is passed alongside)."""

    title: str
    summary: str


class ChapterQueries(BaseModel):
    """LLM query-expansion output: search keywords for one chapter."""

    queries: list[str] = Field(default_factory=list)


class VideoSelection(BaseModel):
    """LLM selection output. chosen_index is 1-based into the presented list;
    None means no candidate was suitable."""

    chosen_index: int | None = None
    reason: str
