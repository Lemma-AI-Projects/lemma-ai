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

from ai.coordinator.types import GoalFact
from ai.methods import DEFAULT_METHOD, METHODS, get_method
from ai.methods.types import GoalView, MethodDirective, MethodInput
from services.agent_context_service import AgentContext


def goal_view(goal: GoalFact | None) -> GoalView | None:
    """The decision layer's goal -> the method layer's copy of it.

    One explicit mapping instead of sharing the dataclass: the decision layer's
    vocabulary must not become the method layer's, or "the Method reads what the
    Coordinator decided" stops being checkable — the two would only ever be able
    to drift together.
    """
    if goal is None:
        return None
    return GoalView(
        target_text=goal.target_text,
        purpose=goal.purpose,
        context=goal.context,
    )


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

    Small and camelCase like the rest of the digest. `completion` and the two
    learner-facing lines are **included**: they are what the turn promised, and a
    panel that explained an answer without them could not answer "why did it
    stop here?". The discipline text is still NOT included — it is static per
    method plus a focus, both of which are here.

    The method's *name* is here (this is the internal inspector). It is
    deliberately absent from what the learner sees — see `method_status`.
    """
    return {
        "name": directive.name,
        "displayName": directive.display_name,
        "focus": directive.focus,
        "systemMove": directive.system_move,
        "learnerMove": directive.learner_move,
        "completion": directive.completion,
        "goalRelation": directive.goal_relation,
        "behaviour": directive.behaviour.model_dump(by_alias=True),
    }


def method_status(
    *, method_name: str | None, goal: GoalFact | None
) -> MethodDirective:
    """What the Focus status bar shows, with no turn in flight.

    Runs the method with **no user message and no context**: the directive's
    learner-facing lines are a property of the method and the space's goal, not
    of what was just typed — asking "what are we doing here" before anything is
    typed is a real question with a real answer.

    One consequence worth stating: `focus` is `None` here, because "which item
    this turn connects to" genuinely depends on the message. The bar therefore
    shows the three standing facts and the goal relation, and not a topic.
    """
    method = get_method(runnable_name(method_name))
    if method is None:  # pragma: no cover — runnable_name never returns unknown
        raise UnknownMethod(str(method_name))
    return method.execute(MethodInput(user_message="", goal=goal_view(goal)))


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
    goal: GoalFact | None = None,
) -> MethodDirective:
    """Run the method for this turn: the teaching move the pipeline must make.

    `agent_context` is None in two legitimate cases (the turn is not inside a
    space, or the doc layer is unavailable). The method still runs — with an
    empty context it must fall back to what it can infer from the learner's own
    words, and each method says out loud what it does without state rather than
    pretending it has some.

    `goal` is passed separately rather than read off `agent_context` on purpose:
    the goal's readers are the decision layer and the method layer, and the
    Global Agent's prompt block is deliberately not one of them (a goal printed
    into every prompt becomes a topic the model keeps bringing up). The method
    carries what the model needs from it inside the discipline.
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
            goal=goal_view(goal),
        )
    )
