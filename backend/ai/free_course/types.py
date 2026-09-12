"""Free-Course products — the conceptual primitives of the mode.

Pure pydantic, no DB / no Celery / no SDK: same boundary discipline as
ai/coursegen (services/ does the persisting). The pipeline walks these in order:

    LearningIntent -> LearningMap -> LearningGap -> LearningPath
                   -> LessonBlueprint -> Lesson -> Observation

Schema philosophy (spec §15: a few strong primitives, not a big ontology):

- **The map is not a table.** A LearningMap IS the courses/course_units/
  course_chapters tree; unit/lesson objectives land on columns (`objective`).
- **The path is not a table.** It is DERIVED from map order + observed progress,
  so it can never drift from the map.
- Rows of their own are needed only for the lesson's content objects and for the
  learner's observations — the two things that genuinely accumulate.

Field sets are deliberately thin: no metadata without a concrete consumer. Field
shapes that cross into the DB (LearningObject, Observation) match
models/free_course.py one-for-one.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Difficulty = Literal["intro", "core", "advanced"]
ObjectKind = Literal["explanation", "example", "practice", "assessment"]
GapStatus = Literal["known", "partial", "unknown"]
Verdict = Literal["correct", "partial", "incorrect"]

# Bounds enforced after every model call (零信任: 形状合法 != 内容可用). A course
# that blows past these is capped, not rejected — the learner still gets a course.
MAX_UNITS = 6
MAX_LESSONS_PER_UNIT = 6
MAX_OBJECTS_PER_LESSON = 12
MIN_UNITS = 1


# --- Step 1: understand ---------------------------------------------------


class LearningIntent(BaseModel):
    """What the learner actually asked for, plus what we decided for them.

    `assumptions` is the honesty valve (spec §2): anything we invented because
    the learner did not say it goes here, so the UI can show it back and let
    them correct it instead of running a 17-field questionnaire first.
    """

    # The learner's own words, kept verbatim for later re-reads and refine.
    raw_request: str
    topic: str
    why: str | None = None
    outcome: str
    level: str | None = None
    time_budget: str | None = None
    depth: str | None = None
    constraints: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)


# --- Step 2: structure ----------------------------------------------------


class MapLesson(BaseModel):
    title: str
    objective: str


class MapUnit(BaseModel):
    title: str
    objective: str
    lessons: list[MapLesson] = Field(default_factory=list)


class LearningMap(BaseModel):
    """The whole course, two levels deep (unit -> lesson).

    Two levels is a deliberate MVP choice: the reference design shows
    unit/lecture/session, but the existing schema is two levels, and inventing a
    third one now would be building for speculation.
    """

    title: str
    # One line of "who this is for" — shown next to the title in the blueprint.
    audience: str
    summary: str
    units: list[MapUnit] = Field(default_factory=list)

    @property
    def lesson_count(self) -> int:
        return sum(len(unit.lessons) for unit in self.units)

    def flatten(self) -> list[tuple[str, str, str]]:
        """(unit_title, lesson_title, objective) in learning order."""
        return [
            (unit.title, lesson.title, lesson.objective)
            for unit in self.units
            for lesson in unit.lessons
        ]


# --- Step 3: gap + path ---------------------------------------------------


class GapItem(BaseModel):
    """One map lesson judged against what we know about the learner."""

    unit_title: str
    lesson_title: str
    status: GapStatus
    reason: str | None = None


class LearningGap(BaseModel):
    """LLM verdict over the map (spec §4). Simple by design — no adaptive
    algorithm, just "obvious gaps" plus a suggested starting point."""

    items: list[GapItem] = Field(default_factory=list)
    # Suggested entry point (a lesson title from the map). None = start at the top.
    start_at: str | None = None
    rationale: str = ""


class PathStep(BaseModel):
    unit_title: str
    lesson_title: str
    objective: str
    status: GapStatus
    # True when the step is to be skipped because the learner already has it.
    skipped: bool = False


class LearningPath(BaseModel):
    """Answer to "what should the learner learn next?" — derived, not invented."""

    goal: str
    prerequisites: list[str] = Field(default_factory=list)
    steps: list[PathStep] = Field(default_factory=list)
    next_lesson_title: str | None = None
    rationale: str = ""


# --- Step 4: lesson blueprint --------------------------------------------


class LessonBlueprint(BaseModel):
    """Everything needed to construct one lesson — and nothing else.

    This is the architectural boundary the spec insists on: the content step
    receives a blueprint, never the raw "write me a course about X" request.
    """

    unit_title: str
    lesson_title: str
    objective: str
    prerequisites: list[str] = Field(default_factory=list)
    # Ordered teaching beats, e.g. 激活前置 / 引入直觉 / 讲解 / 例题 / 练习 / 小测.
    sequence: list[str] = Field(default_factory=list)


# --- Step 5: content -----------------------------------------------------


class PracticeOption(BaseModel):
    id: str
    text: str


class ObjectPayload(BaseModel):
    """Interactive payload. Only objects the learner must answer carry one."""

    options: list[PracticeOption] = Field(default_factory=list)
    # Objective questions: the correct option id (judged locally, spec: 客观题本地判定).
    answer: str | None = None
    # Open questions: what a good answer contains (the LLM judges against this).
    expected: str | None = None
    hint: str | None = None


class LearningObject(BaseModel):
    """One structured piece of a lesson. Markdown body + thin metadata, so the
    runtime can render/grade/反馈 per object instead of one giant text blob."""

    kind: ObjectKind
    title: str
    body: str
    concept: str | None = None
    difficulty: Difficulty = "core"
    payload: ObjectPayload | None = None


class Lesson(BaseModel):
    title: str
    objective: str
    objects: list[LearningObject] = Field(default_factory=list)


# --- Runtime: learner state, response, observation -----------------------


class LearnerState(BaseModel):
    """What Free-Course is allowed to know about the learner right now.

    Free-Course CONSUMES this shape and never owns it (spec §3): the MVP
    provider reads self-reported level + intent hints + how many observations
    this learner already produced. A much richer provider (掌控度/σ from the
    learner layer) plugs in behind the same shape later.
    """

    self_reported_level: str | None = None
    known_topics: list[str] = Field(default_factory=list)
    weak_topics: list[str] = Field(default_factory=list)
    observed_attempts: int = 0
    notes: list[str] = Field(default_factory=list)

    def is_empty(self) -> bool:
        return not (
            self.self_reported_level
            or self.known_topics
            or self.weak_topics
            or self.observed_attempts
            or self.notes
        )


class LearnerResponse(BaseModel):
    """A submission: objective answer (option id), open answer (text), or a
    self-report. `confidence` is 1–5 and optional — collected now because it is
    free to collect, consumed later."""

    option_id: str | None = None
    text: str | None = None
    confidence: int | None = None


class AnswerFeedback(BaseModel):
    """LLM feedback for one answer (verdict comes from the service for objective
    questions — the model only explains)."""

    verdict: Verdict
    feedback: str
    hint: str | None = None


class Observation(BaseModel):
    """The interaction product (spec §8): every answer becomes an observation,
    which is what a future learner-state provider reads back."""

    object_id: str
    kind: Literal["answer", "self_report", "complete"] = "answer"
    response: LearnerResponse | None = None
    verdict: Verdict | None = None
    feedback: str | None = None
    created_at: datetime | None = None


class LearningSession(BaseModel):
    """The runtime read shape for one lesson: content + where the learner is.

    Not a table — it is assembled from the lesson's objects plus that lesson's
    observations, which is exactly what "leave and come back" needs.
    """

    lesson_title: str
    objective: str
    objects: list[LearningObject] = Field(default_factory=list)
    observations: list[Observation] = Field(default_factory=list)
    answered_object_ids: list[str] = Field(default_factory=list)
    is_complete: bool = False


class CourseProduct(BaseModel):
    """Everything one generation produced — what services/ persists."""

    intent: LearningIntent
    map: LearningMap
    path: LearningPath
    blueprint: LessonBlueprint
    lesson: Lesson
