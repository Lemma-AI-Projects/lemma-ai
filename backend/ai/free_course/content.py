"""Step 5 · content: LessonBlueprint -> Lesson (structured objects).

Output must be structured objects, not one wall of text (spec §7): the runtime
renders, grades and gives feedback per object. Everything that arrives is
checked before it reaches the learner — a practice item without a usable answer,
or a lesson without a single interactive object, is dropped or refused rather
than shipped broken.
"""

from ai.client import ai_client
from ai.errors import FreeCourseError
from ai.free_course.persona import UserProfile, describe as describe_profile
from ai.free_course.render import render_blueprint
from ai.free_course.sources import SourceMaterial
from ai.free_course.types import (
    MAX_OBJECTS_PER_LESSON,
    LearningObject,
    Lesson,
    LessonBlueprint,
    ObjectKind,
    ObjectPayload,
    PracticeOption,
)
from ai.types import AIUseCase

_OPTION_IDS = "abcdefgh"


async def generate_lesson(
    blueprint: LessonBlueprint,
    *,
    material: SourceMaterial | None = None,
    user_id: str | None = None,
    tuning: UserProfile | None = None,
) -> Lesson:
    prompt = (
        f"课程蓝图：\n{render_blueprint(blueprint)}\n\n"
        f"可用资料：\n{(material or SourceMaterial()).to_prompt_block()}"
    )
    if tuning is not None:
        prompt += "\n\n" + describe_profile(tuning)
        prompt += (
            f"\n讲解节奏：{tuning.pace}（宽松=分步舒缓、适中=常规、紧凑=快节奏）；"
            f"推导深度：{tuning.depth}。请据此控制叙述篇幅与推导细节。"
        )
    lesson = await ai_client.generate(
        AIUseCase.FREE_COURSE_LESSON, prompt, Lesson, user_id=user_id
    )
    return _bound(lesson, blueprint)


def _bound(lesson: Lesson, blueprint: LessonBlueprint) -> Lesson:
    objects: list[LearningObject] = []
    for raw in lesson.objects[:MAX_OBJECTS_PER_LESSON]:
        title = raw.title.strip()
        body = raw.body.strip()
        if not title or not body:
            continue
        payload = _bound_payload(raw.kind, raw.payload)
        # An interactive object we cannot grade is worse than no interactive
        # object: drop it (宁少勿凑).
        if raw.kind in ("practice", "assessment") and payload is None:
            continue
        objects.append(
            LearningObject(
                kind=raw.kind,
                title=title,
                body=body,
                concept=(raw.concept or "").strip() or None,
                difficulty=raw.difficulty,
                payload=payload,
            )
        )

    if not any(obj.kind == "explanation" for obj in objects):
        raise FreeCourseError("lesson has no explanation object")
    if not any(obj.kind in ("practice", "assessment") for obj in objects):
        raise FreeCourseError("lesson has no gradable practice or assessment")

    return Lesson(
        title=blueprint.lesson_title,
        objective=blueprint.objective,
        objects=objects,
    )


def _bound_payload(kind: ObjectKind, payload: ObjectPayload | None) -> ObjectPayload | None:
    """Normalize an interactive payload, or return None when it is unusable."""
    if kind not in ("practice", "assessment"):
        # Explanations/examples may carry a hint but nothing to answer.
        return None
    if payload is None:
        return None

    options: list[PracticeOption] = []
    seen: set[str] = set()
    for index, option in enumerate(payload.options):
        text = option.text.strip()
        if not text:
            continue
        option_id = option.id.strip() or _OPTION_IDS[len(options)]
        if option_id in seen:
            option_id = _OPTION_IDS[len(options)] if len(options) < len(_OPTION_IDS) else f"o{len(options)}"
        seen.add(option_id)
        options.append(PracticeOption(id=option_id, text=text))

    answer = (payload.answer or "").strip() or None
    if options:
        # The answer must be one of the options we actually kept; if the model
        # pointed at a dropped/missing one, the item is not gradable.
        if answer is None or answer not in seen:
            answer = None
    expected = (payload.expected or "").strip() or None
    if options and answer is None:
        return None
    if not options and expected is None:
        return None

    return ObjectPayload(
        options=options,
        answer=answer,
        expected=expected,
        hint=(payload.hint or "").strip() or None,
    )
