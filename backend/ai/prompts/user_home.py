"""How the learner's Home reaches a prompt.

Kept apart from `user_home_service` on purpose: storage decides what is true,
this file decides what is said. Rewording the block never touches a table, and
adding a column never silently changes the model's instructions.

Three rules are encoded here rather than left to the reader:

  1. **Confirmed only.** Candidates are a question for the user; putting them in
     the prompt would answer that question with the model's assumption.
  2. **Home is explicit about being global.** The block says the lines hold in
     every space, because a model that reads them inside one space will otherwise
     assume they belong to that space.
  3. **The override order is stated, not implied.** Conversation beats space beats
     Home. A model given only the lines will pick arbitrarily when they conflict;
     a model given the order resolves it the way the product promised — and knows
     that a one-off request is not a Home edit.
"""

from services.user_home_service import PreferenceLayer, UserHomeContext

#: A Home is a person's note-to-self, not a dossier: past this it stops being
#: readable at a glance in the inspector.
INTEREST_CAP = 12
PREFERENCE_CAP = 12
ITEM_CHARS = 120

#: Scope wording, shortest honest form. "this turn" outranks "this space"
#: outranks "their Home" — see `user_home_service.preference_layers`.
_SCOPE_LABEL = {
    "conversation": "asked for in THIS turn",
    "space": "a standing setting of THIS space",
    "home": "a standing setting of their Home (global)",
}


def _clip(text: str) -> str:
    text = text.strip()
    return text if len(text) <= ITEM_CHARS else text[:ITEM_CHARS] + "…"


def render_user_home(context: UserHomeContext) -> str:
    """The Global Agent's Home block, or "" when there is nothing to say.

    "" is only returned for a genuinely empty Home — the same choice
    `render_space_context` makes for an empty space, so a caller can treat "" as
    "skip the section" without inventing filler.
    """
    if context.is_empty:
        return ""

    lines: list[str] = [
        "About this learner — their Home. These lines are GLOBAL: they hold in "
        "every space and every conversation, not just this one.",
    ]
    if context.language:
        lines.append(f"- Language they want to be taught in: {context.language}")
    if context.background:
        lines.append(f"- Background: {_clip(context.background)}")
    if context.interests:
        lines.append(f"- Long-term interests: {'; '.join(context.interests[:INTEREST_CAP])}")
    if context.preferences:
        lines.append("- How they like to work:")
        lines.extend(
            f"  - {_clip(text)}" for text in context.preferences[:PREFERENCE_CAP]
        )

    lines.extend(
        [
            "",
            "Teaching preferences stack, most specific wins: what they ask for in "
            "THIS turn > a standing setting of THIS space > the lines above. When "
            "two conflict, follow the more specific one — and never edit their "
            "Home because of a one-off request: only what they state as a lasting "
            "habit belongs there, and it takes their confirmation.",
        ]
    )
    return "\n".join(lines)


def render_preference_stack(layers: list[PreferenceLayer]) -> str:
    """The same rule, but for the layers the current turn actually has.

    `render_user_home` states the order in the abstract; this lists the concrete
    lines in that order, so a conflict between them is visible to the model
    instead of something it has to notice. Returns "" when nothing is set, which
    is the common case.
    """
    if len(layers) < 2:
        # A single layer cannot conflict with anything; the Home block already
        # carried it.
        return ""
    lines = ["Teaching preferences for this turn, most specific first:"]
    lines.extend(
        f"{index}. [{_SCOPE_LABEL.get(layer.scope, layer.scope)}] {_clip(layer.text)}"
        for index, layer in enumerate(layers, start=1)
    )
    lines.append(
        "1 wins when they disagree. The lower lines are context, not instructions "
        "to override — and nothing here changes the learner's Home."
    )
    return "\n".join(lines)
