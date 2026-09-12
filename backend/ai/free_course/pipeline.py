"""The Free-Course pipeline: intent -> map -> path -> blueprint -> lesson.

Shaped as an event stream, not a single return value, because the steps are
sequential model calls (tens of seconds in total) and the learner should watch
structure appear rather than stare at a spinner. The service layer forwards
these events over SSE and persists as they land; the API never sees a product
that was not first announced here.

Failure policy: a failed step yields ``status="failed"`` with a business error
code and ends the stream. The pipeline does not raise through the generator —
the caller inspects the last event, so a half-finished course can be reported to
the learner instead of surfacing as a 500.
"""

from collections.abc import AsyncIterator
from typing import Any, Literal

from pydantic import BaseModel

from ai.errors import AIError, FreeCourseError
from ai.free_course.blueprint import design_blueprint
from ai.free_course.content import generate_lesson
from ai.free_course.intent import understand
from ai.free_course.learner_state import LearnerStateProvider, NullLearnerStateProvider
from ai.free_course.path import assess_gap, build_path
from ai.free_course.sources import Source, SourceMaterial, collect_sources, default_sources
from ai.free_course.structure import structure
from ai.free_course.types import (
    CourseProduct,
    LearnerState,
    LearningIntent,
    LearningMap,
    Lesson,
    LessonBlueprint,
    PathStep,
)

StepName = Literal["intent", "map", "path", "blueprint", "content", "done"]


class FreeCourseEvent(BaseModel):
    """One step of the build, for the progress block in the conversation."""

    step: StepName
    status: Literal["started", "finished", "failed"]
    # Human-readable one-liner for the step row (e.g. "6 个单元 · 21 节课").
    detail: str | None = None
    # The step's product in wire shape — this is what the step block renders
    # under the finished step (intent chips, the unit tree, the path).
    payload: dict[str, Any] | None = None
    error_code: str | None = None
    error_message: str | None = None


async def plan_lesson(
    learning_map: LearningMap,
    step: PathStep,
    *,
    learner_state: LearnerState | None = None,
    material: SourceMaterial | None = None,
    user_id: str | None = None,
) -> tuple[LessonBlueprint, Lesson]:
    """Blueprint then content for one lesson.

    Used when regenerating or refining a lesson (the initial build calls the two
    steps separately so the progress block can show them as distinct steps). The
    invariant it protects is the same on every path: the writer only ever sees a
    blueprint.
    """
    blueprint = await design_blueprint(
        learning_map, step, learner_state=learner_state, user_id=user_id
    )
    lesson = await generate_lesson(blueprint, material=material, user_id=user_id)
    return blueprint, lesson


class FreeCoursePipeline:
    """Runs the five steps once and keeps the product for the caller.

    Dependencies arrive as constructor arguments (learner-state provider,
    sources) because this package must not reach for the database or the network
    itself — the service assembles them.
    """

    def __init__(
        self,
        *,
        learner_state_provider: LearnerStateProvider | None = None,
        sources: list[Source] | None = None,
    ) -> None:
        self._learner_state_provider = (
            learner_state_provider or NullLearnerStateProvider()
        )
        self._sources = sources if sources is not None else default_sources()
        self.product: CourseProduct | None = None
        self.intent: LearningIntent | None = None
        self.learning_map: LearningMap | None = None
        self.lesson: Lesson | None = None
        # Which step is running — used to attribute a failure to a step when the
        # exception surfaces at the generator boundary.
        self._current_step: StepName = "intent"

    async def stream(
        self, request: str, *, user_id: str | None = None
    ) -> AsyncIterator[FreeCourseEvent]:
        try:
            async for event in self._run(request, user_id=user_id):
                yield event
        except (FreeCourseError, AIError) as exc:
            yield FreeCourseEvent(
                step=self._current_step,
                status="failed",
                error_code=getattr(exc, "code", "free_course_error"),
                error_message=str(exc),
            )

    async def _run(
        self, request: str, *, user_id: str | None
    ) -> AsyncIterator[FreeCourseEvent]:
        self._current_step = "intent"
        yield FreeCourseEvent(step="intent", status="started")
        intent = await understand(request, user_id=user_id)
        learner_state = await self._learner_state_provider.get(
            user_id=user_id, intent=intent
        )
        self.intent = intent
        yield FreeCourseEvent(
            step="intent",
            status="finished",
            detail=intent.topic,
            payload=intent.model_dump(mode="json"),
        )

        material = await collect_sources(intent, self._sources)

        self._current_step = "map"
        yield FreeCourseEvent(step="map", status="started")
        learning_map = await structure(
            intent, learner_state=learner_state, material=material, user_id=user_id
        )
        self.learning_map = learning_map
        yield FreeCourseEvent(
            step="map",
            status="finished",
            detail=f"{len(learning_map.units)} 个单元 · {learning_map.lesson_count} 节课",
            payload=learning_map.model_dump(mode="json"),
        )

        self._current_step = "path"
        yield FreeCourseEvent(step="path", status="started")
        gap = await assess_gap(learning_map, learner_state=learner_state, user_id=user_id)
        path = build_path(learning_map, gap, intent=intent)
        if path.next_lesson_title is None:
            raise FreeCourseError("path has no lesson to start from")
        yield FreeCourseEvent(
            step="path",
            status="finished",
            detail=f"从「{path.next_lesson_title}」开始",
            payload=path.model_dump(mode="json"),
        )

        target = next(
            (
                step
                for step in path.steps
                if step.lesson_title == path.next_lesson_title
            ),
            None,
        )
        if target is None:
            raise FreeCourseError("path.next_lesson_title is not a map lesson")

        self._current_step = "blueprint"
        yield FreeCourseEvent(step="blueprint", status="started")
        blueprint = await design_blueprint(
            learning_map, target, learner_state=learner_state, user_id=user_id
        )
        yield FreeCourseEvent(
            step="blueprint",
            status="finished",
            detail=f"{len(blueprint.sequence)} 个教学环节",
            payload=blueprint.model_dump(mode="json"),
        )

        # Content gets its own window: the writer is the slowest step, and the
        # progress block must show it running rather than hiding it inside the
        # blueprint step.
        self._current_step = "content"
        yield FreeCourseEvent(step="content", status="started")
        lesson = await generate_lesson(blueprint, material=material, user_id=user_id)
        self.lesson = lesson
        kinds: dict[str, int] = {}
        for obj in lesson.objects:
            kinds[obj.kind] = kinds.get(obj.kind, 0) + 1
        yield FreeCourseEvent(
            step="content",
            status="finished",
            detail=" · ".join(f"{kind} {count}" for kind, count in kinds.items()),
            payload={
                "title": lesson.title,
                "objective": lesson.objective,
                "objectCount": len(lesson.objects),
            },
        )

        self.product = CourseProduct(
            intent=intent,
            map=learning_map,
            path=path,
            blueprint=blueprint,
            lesson=lesson,
        )
        self._current_step = "done"
        yield FreeCourseEvent(step="done", status="finished", detail=learning_map.title)


async def generate(
    request: str,
    *,
    learner_state_provider: LearnerStateProvider | None = None,
    sources: list[Source] | None = None,
    user_id: str | None = None,
) -> CourseProduct:
    """Non-streaming convenience wrapper (scripts, tests). Raises on failure."""
    pipeline = FreeCoursePipeline(
        learner_state_provider=learner_state_provider, sources=sources
    )
    async for event in pipeline.stream(request, user_id=user_id):
        if event.status == "failed":
            raise FreeCourseError(
                f"{event.step} failed: {event.error_message}",
            )
    if pipeline.product is None:
        raise FreeCourseError("pipeline finished without a product")
    return pipeline.product
