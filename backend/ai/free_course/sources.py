"""Information sources — one of the two reserved interfaces (spec §9).

Free-Course must not be coupled to a source. The pipeline asks the `Source`
interface once per generation; implementations decide where material comes from.
The MVP ships two, and **neither reaches the network**:

- ``LearnerInputSource`` — the learner's own words. Always present.
- ``ModelKnowledgeSource`` — the model's own knowledge. ``discover`` returns
  nothing on purpose: "use what you know, do not invent citations".

A future ``WebSource`` / ``PaperSource`` / ``BookSource`` / ``FileSource`` adds
one implementation and needs zero changes upstream: the prompts already receive
`SourceMaterial.to_prompt_block()`, so retrieved excerpts slot straight in.

Deliberate MVP omission: this branch has **no web retrieval** (`ai/search/` only
searches video platforms). Faking a "researching the web" step in the UI would
be worse than not having one, so the step list says what actually happens.
"""

from typing import Protocol, runtime_checkable

from pydantic import BaseModel, Field

from ai.free_course.types import LearningIntent


class SourceRef(BaseModel):
    """A discoverable thing, before it is read."""

    id: str
    # "user_input" | "model_knowledge" | future: "web" / "paper" / "book" / "file"
    kind: str
    title: str
    # url / file path / page — None for the two MVP sources.
    locator: str | None = None
    snippet: str | None = None


class SourceMaterial(BaseModel):
    """Everything the generation steps are allowed to read, in one object."""

    refs: list[SourceRef] = Field(default_factory=list)
    excerpts: list[str] = Field(default_factory=list)

    @property
    def is_grounded(self) -> bool:
        """True when material came from somewhere other than the learner's own
        words — i.e. the course can cite something. The MVP is never grounded."""
        return any(ref.kind != "user_input" for ref in self.refs)

    def to_prompt_block(self) -> str:
        """Render for the prompts. Empty-ish material still renders, so the
        prompt shape never changes between sources."""
        if not self.refs and not self.excerpts:
            return "（无额外资料，使用你自己的知识）"
        lines = [f"- [{ref.kind}] {ref.title}" for ref in self.refs]
        for excerpt in self.excerpts:
            lines.append(f"  正文：{excerpt}")
        return "\n".join(lines)


@runtime_checkable
class Source(Protocol):
    """The interface. Two methods because discovery and retrieval are separate
    concerns — a pool of candidates is not the same as the text we may read."""

    name: str

    async def discover(self, intent: LearningIntent) -> list[SourceRef]: ...

    async def retrieve(self, ref: SourceRef) -> str | None: ...


class LearnerInputSource:
    """The learner's own request. Always available, always the first ref."""

    name = "learner_input"

    async def discover(self, intent: LearningIntent) -> list[SourceRef]:
        return [
            SourceRef(
                id="user-input",
                kind="user_input",
                title="学习者原话",
                snippet=intent.raw_request,
            )
        ]

    async def retrieve(self, ref: SourceRef) -> str | None:
        return ref.snippet


class ModelKnowledgeSource:
    """The model's own knowledge. Discovers nothing and retrieves nothing —
    its whole contribution is permission to answer from training data, which
    ``to_prompt_block()`` states once, in one place."""

    name = "model_knowledge"

    async def discover(self, intent: LearningIntent) -> list[SourceRef]:
        return []

    async def retrieve(self, ref: SourceRef) -> str | None:
        return None


def default_sources() -> list[Source]:
    """The MVP chain: learner input + model knowledge."""
    return [LearnerInputSource(), ModelKnowledgeSource()]


async def collect_sources(
    intent: LearningIntent, sources: list[Source] | None = None
) -> SourceMaterial:
    """Run discover -> retrieve over every source and merge the results.

    A source that raises is skipped (one unavailable source must not sink a
    course the learner asked for); the material simply comes from the others.
    """
    material = SourceMaterial()
    for source in sources if sources is not None else default_sources():
        try:
            refs = await source.discover(intent)
        except Exception:  # noqa: BLE001 - a dead source is not a dead course
            continue
        for ref in refs:
            material.refs.append(ref)
            try:
                excerpt = await source.retrieve(ref)
            except Exception:  # noqa: BLE001
                excerpt = None
            if excerpt:
                material.excerpts.append(excerpt)
    return material
