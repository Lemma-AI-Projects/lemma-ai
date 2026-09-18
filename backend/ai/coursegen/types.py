"""Course-generation product + AI-IO types.

The products below are the cross-layer shapes the services consume — their
fields are fixed (don't drift). They carry NO DB fields (id / order_index /
build_status): those are generated at persist time. The rest are internal LLM
input/output shapes and never leave the coursegen pipeline.

This module imports only pydantic and the ai/search boundary type; it must never
touch models/, sqlalchemy, celery, tasks/ or apify_client.
"""

from pydantic import BaseModel, Field

from ai.search.types import VideoCandidate

# --- Products (services consume these; field shapes are fixed) ---


class QuestionnaireQuestion(BaseModel):
    # AI-generated stable slug (e.g. "current-level"); unique within a survey.
    id: str
    title: str
    options: list[str]


class Questionnaire(BaseModel):
    """Same shape as schemas.course.QuestionnaireOut (the API turns it into the
    wire contract directly)."""

    questions: list[QuestionnaireQuestion]


# --- 搜索前置: compose (选片 + 组织成 module -> lesson -> point) ---


class ComposedPoint(BaseModel):
    """One LLM-chosen learning point: a title + a candidate_ref into the pool.

    candidate_ref MUST be the stable ref we printed for the candidate
    (f"{platform}:{platform_video_id}"), never a positional index — it is
    validated against the real pool before persistence (零信任 LLM).
    """

    title: str
    candidate_ref: str


class ComposedLesson(BaseModel):
    title: str
    # A few sentences: what this lesson covers and why it comes here.
    summary: str = ""
    points: list[ComposedPoint] = Field(default_factory=list)


class ComposedModule(BaseModel):
    title: str
    # One short paragraph introducing the module (dashboard header copy).
    summary: str = ""
    lessons: list[ComposedLesson] = Field(default_factory=list)


class ComposedCourse(BaseModel):
    """Raw LLM output of course_compose: title + blurb + modules -> lessons ->
    points, each point bound to a candidate_ref. How many of each is decided by
    the model from real supply (诚实交付，宁少凑); validated/resolved into a
    ComposedCourseResult before anything is persisted."""

    title: str
    description: str = ""
    modules: list[ComposedModule] = Field(default_factory=list)


class ResolvedPoint(BaseModel):
    """A validated point: title bound to a REAL candidate from the pool."""

    title: str
    candidate: VideoCandidate


class ResolvedLesson(BaseModel):
    title: str
    summary: str = ""
    points: list[ResolvedPoint]


class ResolvedModule(BaseModel):
    title: str
    summary: str = ""
    lessons: list[ResolvedLesson]


class ComposedCourseResult(BaseModel):
    """Validated compose output — every point resolved to a real candidate
    (fabricated/duplicate/out-of-range refs already dropped, empty lessons and
    modules pruned). The build service persists this directly. Empty modules
    means nothing valid survived -> course failed."""

    title: str
    description: str = ""
    modules: list[ResolvedModule] = Field(default_factory=list)

    @property
    def point_count(self) -> int:
        return sum(
            len(lesson.points) for module in self.modules for lesson in module.lessons
        )


# --- Internal LLM-IO (never crosses the coursegen boundary) ---


class SearchQueries(BaseModel):
    """LLM query-expansion output: broad search keywords for the user's topic."""

    queries: list[str] = Field(default_factory=list)
