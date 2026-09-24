"""Where the Method layer meets a chat turn.

One function does the joining, so "which method ran for this answer" has exactly
one definition. It reads the Agent Context the Global Agent already assembled
(`agent_context_service`) — it does not build context, does not touch the
database and does not write Learner State. A Method is a *reader* of state.

Kept in `services/` rather than in `ai/methods/` so the method package stays
free of models and services: the place where `ai/` would have to import
`services/` is precisely the place where a "small interface" quietly becomes a
framework.
"""

from ai.methods import DEFAULT_METHOD, METHODS, get_method
from ai.methods.types import MethodDirective, MethodInput
from services.agent_context_service import AgentContext


class UnknownMethod(ValueError):
    """A name that is not in the registry. Raised, never defaulted.

    Answering in a different teaching style than the one asked for is worse than
    failing: the caller has no way to notice.
    """

    def __init__(self, name: str) -> None:
        super().__init__(f"unknown method: {name}")
        self.name = name


def resolve_name(name: str | None) -> str:
    """A name that came in on a REQUEST -> the name to run. Strict.

    None means "nobody chose" (a client that does not send the field) and gets
    the default. An unknown string raises — see `UnknownMethod`: the caller
    asked for something specific, and answering in a different style without
    saying so is worse than failing.
    """
    if name is None:
        return DEFAULT_METHOD
    method = get_method(name)
    if method is None:
        raise UnknownMethod(name)
    return method.name


def runnable_name(name: str | None) -> str:
    """A name that came out of the DATABASE -> the name to run. Lenient.

    Deliberately different from `resolve_name`: a stored name was valid when it
    was written, and if a method is ever removed the right outcome for an old
    conversation is to keep working under the default, not to 500 on every
    message. The asymmetry is the point — a bad *request* is a caller bug, a
    stale *row* is history.
    """
    if name is None:
        return DEFAULT_METHOD
    method = get_method(name)
    return method.name if method is not None else DEFAULT_METHOD


def method_digest(directive: MethodDirective) -> dict:
    """The turn's record of which method ran, for the Agent Context panel.

    Small and camelCase like the rest of the digest. The discipline text is NOT
    included: it is static per method plus a focus, both of which are here, and
    the panel's job is to say what shaped the answer, not to reprint it.
    """
    return {
        "name": directive.name,
        "displayName": directive.display_name,
        "focus": directive.focus,
        "behaviour": directive.behaviour.model_dump(by_alias=True),
    }


def list_methods() -> list[dict[str, str]]:
    """The registry, as the picker needs it."""
    return [
        {
            "name": method.name,
            "display_name": method.display_name,
            "description": method.description,
        }
        for method in METHODS.values()
    ]


def directive_for_turn(
    *,
    method_name: str,
    user_message: str,
    agent_context: AgentContext | None,
    history_messages: int = 0,
) -> MethodDirective:
    """Run the method for this turn: the teaching move the pipeline must make.

    `agent_context` is None in two legitimate cases (the turn is not inside a
    space, or the doc layer is unavailable). The method still runs — with an
    empty context it must fall back to what it can infer from the learner's own
    words, and each method says out loud what it does without state rather than
    pretending it has some.
    """
    method = get_method(method_name) or get_method(DEFAULT_METHOD)
    if method is None:  # pragma: no cover — DEFAULT_METHOD is in the registry
        raise UnknownMethod(method_name)
    return method.execute(
        MethodInput(
            user_message=user_message,
            space_context=agent_context.prompt_block if agent_context else "",
            learner_state=agent_context.learner_state_block if agent_context else "",
            outer_fringe=list(agent_context.learner_ready) if agent_context else [],
            history_messages=history_messages,
        )
    )
